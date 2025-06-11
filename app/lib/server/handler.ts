import { ExecuteJobRequest } from '@/api'
import { Context as RunnerContext } from './runner'
import * as Runner from './runner'
import { TGDatabase, User } from './db'
import { CARMetadata } from '@storacha/ui-react'
import { mRachaPointsPerByte } from './constants'

export interface Context extends RunnerContext {
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

  constructor({ storacha, telegram, cipher, db, dbUser }: Context) {
    this.storacha = storacha
    this.telegram = telegram
    this.cipher = cipher
    this.#db = db
    this.#dbUser = dbUser
  }

  async handleJob(request: ExecuteJobRequest) {
    const job = await this.#db.getJobByID(request.jobID, this.#dbUser.id)
    if (!job) throw new Error(`job not found: ${request.jobID}`)
    // check if job was cancelled
    if (job.status != 'queued') {
      return
    }
    const {
      id,
      params,
      created,
      params: { space, dialogs, period },
    } = job
    let progress = 0
    const started = Date.now()
    try {
      await this.#db.updateJob(id, {
        id,
        status: 'running',
        params,
        created,
        started,
        progress,
      })

      let dialogsRetrieved = 0
      const data = await Runner.run(this, space, dialogs, period, {
        onDialogRetrieved: async () => {
          dialogsRetrieved++
          try {
            progress = dialogsRetrieved / Object.keys(dialogs).length / 2.1
            await this.#db.updateJob(id, {
              id,
              status: 'running',
              params,
              created,
              started,
              progress,
            })
          } catch (err) {
            console.error(err)
          }
        },
        onShardStored: (meta: CARMetadata) => {
          this.#db.updateUser(this.#dbUser.id, {
            ...this.#dbUser,
            points: this.#dbUser.points + meta.size * mRachaPointsPerByte,
          })
        },
      })

      await this.#db.updateJob(id, {
        id,
        status: 'completed',
        params,
        data: data.toString(),
        created,
        started,
        finished: Date.now(),
      })
    } catch (err) {
      console.error('backup failed', err)
      await this.#db.updateJob(id, {
        id,
        status: 'failed',
        params,
        progress,
        cause: (err as Error).message,
        created,
        started,
        finished: Date.now(),
      })
    }
  }
}
