import { JobRequest, JobStorage } from '@/api'
import { Context as RunnerContext } from './runner'
import { Context as ServerContext } from './server'
import * as Runner from './runner'
import { TGDatabase, User } from './db'
import { CARMetadata } from '@storacha/ui-react'
import { mRachaPointsPerByte } from './constants'

export interface Context extends RunnerContext, ServerContext {
  jobs: JobStorage
  db: TGDatabase
  dbUser: User
}

export const create = async (ctx: Context) => {
  return new Handler(ctx)
}

class Handler {
  storacha
  telegram
  cipher
  #db
  #dbUser
  #jobs
  #queueFn

  constructor ({ storacha, telegram, cipher, jobs, db, dbUser, queueFn }: Context) {
    this.storacha = storacha
    this.telegram = telegram
    this.cipher = cipher
    this.#db = db
    this.#dbUser = dbUser
    this.#jobs = jobs
    this.#queueFn = queueFn
  }

  async queueJob(request: JobRequest) {
    const job = await this.#jobs.find(request.jobID)
    if (!job) throw new Error(`job not found: ${request.jobID}`)

    await this.#jobs.replace({
      id: job.id,
      status: 'queued',
      params: job.params,
      created: job.created
    })
    this.#queueFn(request)
  }

  async handleJob(request: JobRequest) {
    const job = await this.#jobs.find(request.jobID)
    if (!job) throw new Error(`job not found: ${request.jobID}`)
    // check if job was cancelled
    if (job.status != 'queued') {
      return
    }
    const { id, params, created, params: { space, dialogs: dialogStrings, period} } = job
    const dialogs = new Set(dialogStrings.map((d) => BigInt(d)))
    let progress = 0
    const started = Date.now()
    try {

      await this.#jobs.replace({
        id,
        status: 'running',
        params,
        created,
        started,
        progress
      })
    
      let dialogsRetrieved = 0
      const data = await Runner.run(this, space, dialogs, period, {
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
        },
        onShardStored: (meta: CARMetadata) => {
          this.#db.updateUser(this.#dbUser.id, {...this.#dbUser, points: (this.#dbUser.points + (meta.size * mRachaPointsPerByte))})
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
    }
  }
}