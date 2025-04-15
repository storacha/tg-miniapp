import { AbsolutePeriod, BackupStorage, JobID, JobStorage, Period } from '@/api'
import { SpaceDID } from '@storacha/ui-react'
import Queue from 'p-queue'
import * as Runner from './runner'
import { Context as RunnerContext } from './runner'


export interface Context extends RunnerContext {
  jobs: JobStorage
  backups: BackupStorage
}

export const create = async (ctx: Context) => {
  // error any jobs that are queued or meant to be running
  const { items: currentJobs } = await ctx.jobs.list()
  for (const job of currentJobs) {
    if (job.state !== 'failed') {
      await ctx.jobs.update(job.id, { state: 'failed', error: 'backup failed, please try again.' })
    }
  }
  return new JobManager(ctx)
}

class JobManager {
  storacha
  telegram
  encryptionPassword

  #jobs
  #backups
  #queue
  #queuedJobs
  #cancelledJobs
  #runningJobs

  constructor ({ storacha, telegram, encryptionPassword, jobs, backups }: Context) {
    this.storacha = storacha
    this.telegram = telegram
    this.encryptionPassword = encryptionPassword
    this.#jobs = jobs
    this.#backups = backups
    this.#queue = new Queue({ concurrency: 1 })
    this.#queuedJobs = new Set()
    this.#runningJobs = new Set()
    this.#cancelledJobs = new Set()
  }

  async add (space: SpaceDID, dialogs: Set<bigint>, period: Period) {
    const id = self.crypto.randomUUID()
    const absPeriod: AbsolutePeriod = [period[0], period[1] ?? Date.now() / 1000]

    await this.#jobs.add({
      id,
      state: 'queued',
      progress: 0,
      space,
      dialogs,
      period: absPeriod
    })

    this.#queue.add(async () => {
      try {
        this.#runningJobs.add(id)
        this.#queuedJobs.delete(id)

        if (this.#cancelledJobs.has(id)) {
          this.#cancelledJobs.delete(id)
          return
        }

        await this.#jobs.update(id, { state: 'running', error: '' })

        let dialogsCompleted = 0
        const data = await Runner.run(this, space, dialogs, absPeriod, {
          onDialogRetrieved: async () => {
            try {
              await this.#jobs.update(id, { progress: ((dialogsCompleted * 2) + 1) / (dialogs.size * 2) })
            } catch (err) {
              console.error(err)
            }
          },
          onDialogStored: async () => {
            dialogsCompleted++
            try {
              await this.#jobs.update(id, { progress: dialogsCompleted / dialogs.size })
            } catch (err) {
              console.error(err)
            }
          }
        })

        await this.#jobs.update(id, { progress: 1 })
        await this.#backups.add({ data, dialogs, period: absPeriod, created: Date.now() })
        await this.#jobs.remove(id)
      } catch (err) {
        console.error('backup failed', err)
        await this.#jobs.update(id, { state: 'failed', error: (err as Error).message })
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
