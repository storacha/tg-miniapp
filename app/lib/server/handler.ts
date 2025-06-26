import { ExecuteJobRequest } from '@/api'
import { Context as RunnerContext } from './runner'
import * as Runner from './runner'
import { TGDatabase, User } from './db'
import { CARMetadata } from '@storacha/ui-react'
import { mRachaPointsPerByte } from './constants'
import { SHARD_SIZE } from '@storacha/upload-client'

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

    const started = Date.now()
    const totalDialogs = Object.keys(dialogs).length
    let progress = 0
    let dialogsRetrieved = 0
    let dialogsCompleted = 0
    let totalBytesUploaded = 0

    /**
     * Calculates the progress of the backup job, excluding the final shard storage phase.
     * - Dialog retrieval accounts for 20% of the total progress.
     * - Message retrieval accounts for 50% of the total progress.
     * @returns The current progress percentage of the backup job, excluding the last storage step.
     */
    const getDialogsProgress = () =>
      (dialogsRetrieved / totalDialogs) * 0.2 +
      (dialogsCompleted / totalDialogs) * 0.5

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
        /**
         * Called when a dialog entity is created and ready for processing
         */
        onDialogRetrieved: async (dialogId) => {
          try {
            const currentJob = await this.#db.getJobByID(
              request.jobID,
              this.#dbUser.id
            )
            if (currentJob?.status === 'canceled') {
              console.warn(`Job ${id} was canceled`)
              return
            }

            dialogsRetrieved++
            progress = getDialogsProgress()

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
              `Error updating progress during dialog ${dialogId.toString()} retrieval:`,
              err
            )
          }
        },

        /**
         * Called when all messages for a dialog have been retrieved
         */
        onMessagesRetrieved: async (dialogId) => {
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
            progress = getDialogsProgress()

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
              `Error updating progress during messages retried for dialog ${dialogId.toString()}:`,
              err
            )
          }
        },

        onShardStored: async (meta: CARMetadata) => {
          try {
            /**
             * Called after all messages have been retrieved for all dialogs.
             * If the total uploaded bytes are less than SHARD_SIZE, the backup job is considered complete.
             */
            totalBytesUploaded += meta.size
            progress = totalBytesUploaded <= SHARD_SIZE ? 1 : 0.9

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
        },
      })

      // Only award points after successful backup completion
      const pointsEarned = totalBytesUploaded * mRachaPointsPerByte
      console.log(
        `total size uploaded: ${totalBytesUploaded} bytes, points earned: ${pointsEarned}`
      )

      this.#dbUser = await this.#db.incrementUserPoints(
        this.#dbUser.id,
        pointsEarned
      )

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
