import { AbsolutePeriod, JobID, JobSender, JobStorage, Period } from '@/api'
import { SpaceDID } from '@storacha/ui-react'
export interface Context {
  jobs: JobStorage
  jobSender: JobSender
}

export const create = async (ctx: Context) => {
  // error any jobs that are queued or meant to be running
  const { items: currentJobs } = await ctx.jobs.listPending()
  for (const job of currentJobs) {
    if (job.status !== 'failed') {
      await ctx.jobs.replace({
        id: job.id,
        status: 'failed',
        params: job.params,
        progress: 'progress' in job ? job.progress : 0,
        cause: 'backup failed, please try again.',
        created: job.created,
        ...('started' in job ? { started: job.started } : {}),
        finished: Date.now()
      })
    }
  }
  return new JobManager(ctx)
}

class JobManager {
  
  #jobs
  #jobSender

  constructor ({ jobs, jobSender }: Context) {
    this.#jobs = jobs
    this.#jobSender = jobSender
  }

  async add (space: SpaceDID, dialogs: Set<bigint>, period: Period) {
    const id = self.crypto.randomUUID()
    const absPeriod: AbsolutePeriod = [period[0], period[1] ?? Date.now() / 1000]
    const params = {
      space,
      dialogs: [...dialogs].map(d => d.toString()),
      period: absPeriod
    }

    await this.#jobs.add({
      id,
      status: 'waiting',
      params: params,
      created: Date.now(),
    })

    await this.#jobSender.sendJob(id)

    return id
  }

  async remove (id: JobID) {
    const job = await this.#jobs.find(id)
    if (!job) throw new Error(`job not found: ${id}`)


    await this.#jobs.remove(id)
  }
}
