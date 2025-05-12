import { AbsolutePeriod, JobID, JobSender, JobStorage, Period } from '@/api'
import { SpaceDID } from '@storacha/ui-react'
export interface Context {
  jobs: JobStorage
  jobSender: JobSender
}

export const create = async (ctx: Context) => {
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

    this.#jobSender.sendJob(id)

    return id
  }

  async remove (id: JobID) {
    const job = await this.#jobs.find(id)
    if (!job) throw new Error(`job not found: ${id}`)


    await this.#jobs.remove(id)
  }
}
