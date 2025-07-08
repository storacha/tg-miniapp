import { DeleteDialogFromJobRequest, ExecuteJobRequest, ToString } from '@/api'
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
    let totalBytesUploaded = 0
    const dialogPercentages: Record<ToString<bigint>, number> = {}

    const getDialogsCompleted = () => {
      return Object.values(dialogPercentages).reduce(
        (acc, percentage) => acc + percentage,
        0
      )
    }
    /**
     * Calculates the progress of the backup job, excluding the final shard storage phase.
     * - Dialog retrieval accounts for 20% of the total progress.
     * - Message retrieval accounts for 70% of the total progress.
     * @returns The current progress percentage of the backup job, excluding the last storage step.
     */
    const getDialogsProgress = () =>
      (dialogsRetrieved / totalDialogs) * 0.2 +
      (getDialogsCompleted() / totalDialogs) * 0.7

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
        onMessagesRetrieved: async (dialogId, percentage) => {
          try {
            const currentJob = await this.#db.getJobByID(
              request.jobID,
              this.#dbUser.id
            )
            if (currentJob?.status === 'canceled') {
              console.warn(`Job ${id} was canceled`)
              return
            }
            console.log(
              `Dialog ${dialogId.toString()} percentage retrieved: ${(percentage * 100).toFixed(2)}%`
            )
            dialogPercentages[dialogId.toString()] = percentage
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
             * Called as shards are uploaded to storage.
             * We calculate the total size uploaded so far
             * However, since we don't know the total size of the backup until all shards are uploaded,
             * we don't upload the final progress until the last shard is stored.
             * If the total uploaded bytes are less than SHARD_SIZE, the backup job is considered complete.
             */
            totalBytesUploaded += meta.size
            progress = totalBytesUploaded <= SHARD_SIZE ? 1 : progress

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
        `user ${this.#dbUser.id} total size uploaded: ${totalBytesUploaded} bytes, points earned: ${pointsEarned}`
      )

      console.log(
        `user ${this.#dbUser.id} points before backup: ${this.#dbUser.points}`
      )
      this.#dbUser = await this.#db.incrementUserPoints(
        this.#dbUser.id,
        pointsEarned
      )
      console.log(
        `user ${this.#dbUser.id} points after backup: ${this.#dbUser.points}`
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

  async deleteDialogFromJob(request: DeleteDialogFromJobRequest) {
    const job = await this.#db.getJobByID(request.jobID, this.#dbUser.id)
    if (!job) throw new Error(`job not found: ${request.jobID}`)
    // check if job was cancelled
    if (job.status != 'completed') {
      throw new Error(`job is not completed: ${request.jobID}`)
    }
    const { dialogs } = job.params
    if (!dialogs[request.dialogID]) {
      throw new Error(`dialog not found in job: ${request.dialogID}`)
    }
    delete dialogs[request.dialogID]
    const newData = await Runner.deleteDialogFromBackup(
      this,
      request.dialogID,
      job.data
    )
    await this.#db.updateJob(request.jobID, {
      ...job,
      params: {
        ...job.params,
        dialogs,
      },
      data: newData.toString(),
      updated: Date.now(),
    })
  }
}
