import { CID } from 'multiformats'
import {
  DeleteDialogFromJob,
  DialogsById,
  ExecuteJobRequest,
  ToString,
} from '@/api'
import { Context as RunnerContext } from './runner'
import * as Runner from './runner'
import { TGDatabase, User } from './db'
import { MAX_FREE_BYTES, mRachaPointsPerByte } from './constants'
import { SHARD_SIZE } from '@storacha/upload-client'
import { formatBytes } from '../utils'
import { logJobEvent } from './logger'

export interface Context extends RunnerContext {
  db: TGDatabase
  dbUser: User
}

export const create = async (ctx: Context) => {
  return new Handler(ctx)
}

/**
 * Handler is responsible for managing backup jobs and dialog operations within the Storacha Telegram Mini App.
 *
 * This class orchestrates the execution, progress tracking, and completion of backup jobs, as well as the deletion of dialogs from completed jobs.
 * It interacts with the database, Telegram API, encryption utilities, and storage services to ensure reliable backup and restoration workflows.
 *
 * Key Responsibilities:
 * - Initiates and monitors backup jobs, updating progress and handling cancellation or failure scenarios.
 * - Calculates and updates job progress based on dialog and message retrieval, as well as storage shard uploads.
 * - Awards user points based on the total data uploaded upon successful backup completion.
 * - Allows deletion of specific dialogs from completed jobs, updating both storage and job metadata accordingly.
 *
 * Dependencies are injected via the constructor, including storage, Telegram, cipher, and database interfaces.
 *
 * @remarks
 * This class is intended for server-side use within the Telegram Mini App workspace and assumes trusted access to user and job context.
 */
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

  async getStorachaUsage(space: `did:key:${string}`): Promise<number | null> {
    const now = new Date()
    try {
      const usage = await this.storacha.capability.usage.report(space, {
        from: new Date(
          now.getUTCFullYear(),
          now.getUTCMonth() - 1,
          now.getUTCDate(),
          0,
          0,
          0,
          0
        ),
        to: now,
      })

      // i don't think we allow people to create or own multiple
      // spaces for now in the TG mini app
      // if it happens in the future, we should account for it.
      return Object.values(usage).reduce(
        (sum, report) => sum + report.size.final,
        0
      )
    } catch (err) {
      console.error('Error while fetching usage report:', err)
      throw new Error(`Failed to fetch usage report.`, { cause: err })
    }
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

    // Track errors from the onShardStored callback.
    // Note: Throwing inside onShardStored does not halt the backup process, so we record any errors here for later handling.
    /* eslint-disable-next-line prefer-const */
    let onShardStoredError: Error | null = null
    const started = Date.now()
    const totalDialogs = Object.keys(dialogs).length
    let progress = 0
    let dialogsRetrieved = 0
    let totalBytesUploaded = 0
    const dialogPercentages: Record<ToString<bigint>, number> = {}
    const dialogSizes: Record<ToString<bigint>, number> = {}

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
            if (onShardStoredError) throw onShardStoredError
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
            throw new Error(
              `Failed to retrieve dialog ${dialogId.toString()}.`,
              { cause: err }
            )
          }
        },
        /**
         * Called when all messages for a dialog have been retrieved
         */
        onMessagesRetrieved: async (dialogId, percentage) => {
          try {
            if (onShardStoredError) throw onShardStoredError

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
            throw new Error(
              `Failed to retrieve messages for dialog ${dialogId.toString()}.`,
              { cause: err }
            )
          }
        },
      
        onShardStored: async (
          meta: CARMetadata,
          dialogId?: ToString<bigint>
        ) => {
          try {
            const amountOfStorageUsed = await this.getStorachaUsage(space)
            if (
              amountOfStorageUsed &&
              amountOfStorageUsed + meta.size > MAX_FREE_BYTES
            ) {
              console.warn(
                `Backup for user ${this.#dbUser.id} would exceed storage limit: ${formatBytes(
                  amountOfStorageUsed + meta.size
                )} > ${formatBytes(MAX_FREE_BYTES)}`
              )
              onShardStoredError = new Error(
                `This backup would exceed your ${formatBytes(MAX_FREE_BYTES)} storage limit.`
              )
            }
            totalBytesUploaded += meta.size

            if (dialogId) {
              // Dialog-level shard storage
              dialogSizes[dialogId] = (dialogSizes[dialogId] || 0) + meta.size
            } else {
              /**
               * Called as shards are uploaded to storage.
               * We calculate the total size uploaded so far
               * However, since we don't know the total size of the backup until all shards are uploaded,
               * we don't upload the final progress until the last shard is stored.
               * If the total uploaded bytes are less than SHARD_SIZE, the backup job is considered complete.
               */
              progress = totalBytesUploaded <= SHARD_SIZE ? 1 : progress
            }

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
            if (onShardStoredError) {
              // TODO: this does not halt the upload process, it still uploads the shards
              throw onShardStoredError
            }
          }
        },
      })

      // Since throwing on onShardStored does not halt the backup process, we at least register the job as failed, but the shards will still be uploaded.
      if (onShardStoredError) throw onShardStoredError

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

      const dialogsWithBackupInfo: DialogsById = {}
      for (const [dialogId, dialogInfo] of Object.entries(dialogs)) {
        const dialogSize = dialogSizes[dialogId] || 0
        const dialogPoints = dialogSize * mRachaPointsPerByte

        dialogsWithBackupInfo[dialogId] = {
          ...dialogInfo,
          sizeRewardInfo: {
            size: dialogSize,
            points: dialogPoints,
          },
        }
      }

      await this.#db.updateJob(id, {
        id,
        status: 'completed',
        params: {
          ...job.params,
          dialogs: dialogsWithBackupInfo,
        },
        data: data.toString(),
        points: pointsEarned,
        size: totalBytesUploaded,
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

  /**
   * Removes a dialog from a completed backup job and updates all related data structures.
   *
   * @param request - Contains jobID and dialogID for the dialog to be deleted
   * @throws {Error} If the job is not found, not completed, or dialog doesn't exist in the job
   *
   * @remarks
   * This is a destructive operation that permanently removes the dialog's backup data
   * from storage. The dialog cannot be recovered after deletion. The method ensures
   * data consistency by atomically updating both the storage layer and job metadata.
   */
  async deleteDialogFromJob(request: DeleteDialogFromJob) {
    const job = await this.#db.getJobByID(request.jobID, this.#dbUser.id)
    if (!job) throw new Error(`job not found: ${request.jobID}`)

    // Validates that the job exists and is in 'completed' status
    if (job.status != 'completed') {
      throw new Error(`job is not completed: ${request.jobID}`)
    }

    const { dialogs } = job.params
    if (!dialogs[request.dialogID]) {
      throw new Error(`dialog not found in job: ${request.dialogID}`)
    }

    let pointsToSubtract = dialogs[request.dialogID].sizeRewardInfo?.points || 0
    const dialogSize = dialogs[request.dialogID].sizeRewardInfo?.size || 0
    delete dialogs[request.dialogID]

    try {
      // is this dialog the only dialog in the job?
      if (Object.keys(dialogs).length === 0) {
        console.log(
          `Deleting job ${request.jobID} because it has no dialogs left`
        )
        try {
          const cid = CID.parse(job.data)
          await this.storacha.remove(cid, { shards: true })
          await this.#db.deleteJob(request.jobID, this.#dbUser.id)
          pointsToSubtract = job.points
        } catch (err) {
          // @ts-expect-error err.cause doesn't typecheck
          const errorName = (err.cause.name || '') as string
          if (errorName === 'UploadNotFound') {
            console.warn(
              `Upload not found ${job.data} for job ${request.jobID}, removing job from DB`
            )
          } else {
            throw new Error(
              `Failed to delete job ${request.jobID} with data ${job.data}`,
              { cause: err }
            )
          }
        }
      } else {
        // Removes the dialog's encrypted data from Storacha storage and creates a new backup root without the deleted dialog
        const newData = await Runner.deleteDialogFromBackup(
          this,
          request.dialogID,
          job.data
        )

        const points = job.points - pointsToSubtract
        const size = job.size - dialogSize

        await this.#db.updateJob(request.jobID, {
          ...job,
          params: {
            ...job.params,
            dialogs, // update the dialogs in the job params
          },
          points,
          size,
          data: newData.toString(), // update the backup root with the new one
          updated: Date.now(),
        })
      }

      if (pointsToSubtract > 0) {
        this.#dbUser = await this.#db.incrementUserPoints(
          this.#dbUser.id,
          -pointsToSubtract
        )
        console.log(
          `Subtracted ${pointsToSubtract} points from user ${this.#dbUser.id}`
        )
      }
    } catch (err) {
      throw new Error(
        `Failed to delete dialog ${request.dialogID} from job ${request.jobID}`,
        { cause: err }
      )
    }
  }
}
