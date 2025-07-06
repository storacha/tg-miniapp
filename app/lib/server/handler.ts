import { ExecuteJobRequest } from '@/api'
import { Context as RunnerContext } from './runner'
import * as Runner from './runner'
import { TGDatabase, User } from './db'
import { mRachaPointsPerByte } from './constants'
import { SHARD_SIZE } from '@storacha/upload-client'
import { logJobEvent } from './logger'

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
      const correlationId = (request as { correlationId?: string })?.correlationId;
      logJobEvent({
        level: 'info',
        jobId: id,
        userId: this.#dbUser.id,
        step: 'jobStart',
        phase: 'init',
        correlationId,
        message: 'Job started',
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
              // Job was canceled before dialog retrieval completed
              logJobEvent({
                level: 'warn',
                jobId: id,
                userId: this.#dbUser.id,
                step: 'onDialogRetrieved',
                phase: 'processing',
                correlationId,
                dialogId: dialogId.toString(),
                message: 'Job was canceled during dialog retrieval',
              })
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
            logJobEvent({
              level: 'info',
              jobId: id,
              userId: this.#dbUser.id,
              step: 'onDialogRetrieved',
              phase: 'processing',
              correlationId,
              dialogId: dialogId.toString(),
              message: 'Dialog retrieved',
              progress,
            })
          } catch (err) {
            // Error occurred while updating progress during dialog retrieval
            logJobEvent({
              level: 'error',
              jobId: id,
              userId: this.#dbUser.id,
              step: 'onDialogRetrieved',
              phase: 'processing',
              correlationId,
              dialogId: dialogId.toString(),
              message: 'Error updating progress during dialog retrieval',
              error: err instanceof Error ? err.message : String(err),
            })
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
              // Job was canceled before messages retrieval completed
              logJobEvent({
                level: 'warn',
                jobId: id,
                userId: this.#dbUser.id,
                step: 'onMessagesRetrieved',
                phase: 'processing',
                correlationId,
                dialogId: dialogId.toString(),
                message: 'Job was canceled during messages retrieval',
              })
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
            logJobEvent({
              level: 'info',
              jobId: id,
              userId: this.#dbUser.id,
              step: 'onMessagesRetrieved',
              phase: 'processing',
              correlationId,
              dialogId: dialogId.toString(),
              message: 'Messages retrieved for dialog',
              progress,
            })
          } catch (err) {
            // Error occurred while updating progress during messages retrieval
            logJobEvent({
              level: 'error',
              jobId: id,
              userId: this.#dbUser.id,
              step: 'onMessagesRetrieved',
              phase: 'processing',
              correlationId,
              dialogId: dialogId.toString(),
              message: 'Error updating progress during messages retrieval',
              error: err instanceof Error ? err.message : String(err),
            })
          }
        },
        /**
         * Called after all messages have been retrieved for all dialogs.
         * If the total uploaded bytes are less than SHARD_SIZE, the backup job is considered complete.
         */
        onShardStored: async (meta) => {
          try {
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
            logJobEvent({
              level: 'info',
              jobId: id,
              userId: this.#dbUser.id,
              step: 'onShardStored',
              phase: 'finalizing',
              correlationId,
              message: 'Shard stored',
              meta,
              progress,
            })
          } catch (err) {
            // Error occurred while updating progress during shard storage
            logJobEvent({
              level: 'error',
              jobId: id,
              userId: this.#dbUser.id,
              step: 'onShardStored',
              phase: 'finalizing',
              correlationId,
              message: 'Error updating progress during shard storage',
              error: err instanceof Error ? err.message : String(err),
            })
          }
        },
      })
      // Only award points after successful backup completion
      const pointsEarned = totalBytesUploaded * mRachaPointsPerByte
      logJobEvent({
        level: 'info',
        jobId: id,
        userId: this.#dbUser.id,
        step: 'jobPointsAward',
        phase: 'finalizing',
        correlationId,
        message: 'Points awarded after backup',
        pointsEarned,
        totalBytesUploaded,
      })
      this.#dbUser = await this.#db.incrementUserPoints(
        this.#dbUser.id,
        pointsEarned
      )
      logJobEvent({
        level: 'info',
        jobId: id,
        userId: this.#dbUser.id,
        step: 'jobComplete',
        phase: 'complete',
        correlationId,
        message: 'Job completed',
        points: this.#dbUser.points,
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
      // Backup job failed
      const correlationId = (request as { correlationId?: string })?.correlationId;
      logJobEvent({
        level: 'error',
        jobId: id,
        userId: this.#dbUser.id,
        step: 'jobFailed',
        phase: 'error',
        correlationId,
        message: 'Backup job failed',
        error: err instanceof Error ? err.message : String(err),
      })
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
