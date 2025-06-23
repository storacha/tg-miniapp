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
    const totalDialogs = Object.keys(dialogs).length
    let dialogsCompleted = 0

    try {
      await this.#db.updateJob(id, {
        id,
        status: 'running',
        params,
        created,
        started,
        progress: 0,
        updated: Date.now(),
      })

      const data = await Runner.run(this, space, dialogs, period, {
        onDialogRetrieved: async () => {
          try {
            const currentJob = await this.#db.getJobByID(
              request.jobID,
              this.#dbUser.id
            )
            if (currentJob?.status === 'canceled') {
              console.warn(`Job ${id} was canceled`)
              return
            }

            dialogsCompleted++
            progress = Math.min(0.7, (dialogsCompleted / totalDialogs) * 0.1)
            await this.#db.updateJob(id, {
              id,
              status: 'running',
              params,
              created,
              started,
              progress,
              updated: Date.now(),
            })
          } catch (err) {
            console.error(
              'Error updating progress during dialog retrieval:',
              err
            )
          }
        },

        onShardStored: async (meta: CARMetadata) => {
          progress = Math.min(
            1.0,
            0.7 + (dialogsCompleted / totalDialogs) * 0.3
          )

          try {
            await this.#db.updateJob(id, {
              id,
              status: 'running',
              params,
              created,
              started,
              progress,
              updated: Date.now(),
            })
          } catch (err) {
            console.error('Error updating progress during shard storage:', err)
          }

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
        updated: Date.now(),
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
        updated: Date.now(),
      })
    }
  }
}
