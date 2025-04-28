import { AbsolutePeriod, FailedJob, JobID, JobStorage, Period } from '@/api'
import { SpaceDID } from '@storacha/ui-react'
import Queue from 'p-queue'
import * as Runner from './runner'
import { Context as RunnerContext } from './runner'

export interface Context extends RunnerContext {
  jobs: JobStorage
}

export const create = async (ctx: Context) => {
  // error any jobs that are queued or meant to be running
  const { items: currentJobs } = await ctx.jobs.listPending()
  for (const job of currentJobs) {
    if (job.status !== 'failed') {
      const failure: FailedJob = {
        id: job.id,
        status: 'failed',
        params: job.params,
        progress: 'progress' in job ? job.progress : 0,
        cause: 'backup failed, please try again.',
        created: job.created,
        ...('started' in job ? { started: job.started } : {}),
        finished: Date.now()
      }
      await ctx.jobs.replace(failure)
    }
  }
  return new JobManager(ctx)
}

class JobManager {
  storacha
  telegram
  cipher

  #jobs
  #queue
  #queuedJobs
  #cancelledJobs
  #runningJobs

  constructor ({ storacha, telegram, cipher, jobs }: Context) {
    this.storacha = storacha
    this.telegram = telegram
    this.cipher = cipher
    this.#jobs = jobs
    this.#queue = new Queue({ concurrency: 1 })
    this.#queuedJobs = new Set()
    this.#runningJobs = new Set()
    this.#cancelledJobs = new Set()
  }

  async add (space: SpaceDID, dialogs: Set<bigint>, period: Period) {
    const id = self.crypto.randomUUID()
    const absPeriod: AbsolutePeriod = [period[0], period[1] ?? Date.now() / 1000]
    const params = {
      space,
      dialogs: [...dialogs].map(d => d.toString()),
      period: absPeriod
    }
    const created = Date.now()

    // await this.#jobs.add({
    //   id,
    //   status: 'waiting',
    //   params: params,
    //   created: Date.now(),
    // })

    // since the manager is also queue we can skip the `waiting` status
    await this.#jobs.add({
      id,
      status: 'queued',
      params: params,
      created
    })

    let progress = 0
    let started: number
    this.#queue.add(async () => {
      try {
        this.#runningJobs.add(id)
        this.#queuedJobs.delete(id)

        if (this.#cancelledJobs.has(id)) {
          this.#cancelledJobs.delete(id)
          return
        }

        started = Date.now()
        await this.#jobs.replace({
          id,
          status: 'running',
          params,
          created,
          started,
          progress
        })

        let dialogsRetrieved = 0
        const data = await Runner.run(this, space, dialogs, absPeriod, {
          onDialogRetrieved: async () => {
            dialogsRetrieved++
            try {
              progress = (dialogsRetrieved / dialogs.size) / 2.1
              await this.#jobs.replace({
                id,
                status: 'running',
                params,
                created,
                started,
                progress
              })
            } catch (err) {
              console.error(err)
            }
          }
        })

        await this.#jobs.replace({
          id,
          status: 'completed',
          params,
          data,
          created,
          started,
          finished: Date.now()
        })
      } catch (err) {
        console.error('backup failed', err)
        await this.#jobs.replace({
          id,
          status: 'failed',
          params,
          progress,
          cause: (err as Error).message,
          created,
          started,
          finished: Date.now()
        })
      } finally {
        this.#runningJobs.delete(id)
      }
    })
    this.#queuedJobs.add(id)

    return id
  }

  async remove (id: JobID) {
    const job = await this.#jobs.find(id)
    if (!job) throw new Error(`job not found: ${id}`)

    if (this.#runningJobs.has(id)) {
      throw new Error('cannot remove job as it is currently running')
    }

    if (this.#queuedJobs.has(id)) {
      this.#cancelledJobs.add(id)
    }

    await this.#jobs.remove(id)
  }
}
