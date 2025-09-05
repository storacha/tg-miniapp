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
import { CARMetadata } from '@storacha/ui-react'
import { MAX_FREE_BYTES, mRachaPointsPerByte } from './constants'
import { SHARD_SIZE } from '@storacha/upload-client'
import { formatBytes } from '../utils'
import { createLogger } from './logger'
import { getErrorMessage } from '../errorhandling'
import { getStorachaUsage, isStorageLimitExceeded } from '../storacha'
import { AccountDID } from '@storacha/access'
import { gracefulShutdown } from './graceful-shutdown'

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

  async handleJob(request: ExecuteJobRequest) {
    if (gracefulShutdown.isShutdownInitiated()) {
      throw new Error('Server is shutting down, job will be requeued')
    }

    const telegramCleanup = async () => {
      if (this.telegram) {
        await this.telegram.destroy()
        console.log('telegram client disconnected')
      }
    }
    gracefulShutdown.registerActiveJob(request, telegramCleanup)

    const job = await this.#db.getJobByID(request.jobID, this.#dbUser.id)
    if (!job) throw new Error(`job not found: ${request.jobID}`)

    const {
      id,
      params,
      created,
      params: { space, dialogs, period },
    } = job
    const totalDialogs = Object.keys(dialogs).length

    const logContext = {
      jobId: request.jobID,
      userId: this.#dbUser.id,
      periodFrom: period[0],
      periodTo: period[1] ?? Date.now() / 1000,
      totalDialogs,
    }
    const logger = createLogger(logContext)

    // Validates that the job exists and is in 'queued' status
    // check if job was cancelled
    if (job.status != 'queued') {
      logger.warn('Job not in queued status', {
        step: 'handleJob',
        phase: 'validation',
        status: job.status,
      })
      return
    }

    // Track errors from the onShardStored callback.
    // Note: Throwing inside onShardStored does not halt the backup process, so we record any errors here for later handling.
    /* eslint-disable-next-line prefer-const */
    let onShardStoredError: Error | null = null
    const started = Date.now()
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

      logger.info('Job started', {
        step: 'jobStart',
        phase: 'init',
        progress,
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
              logger.warn('Job was canceled', {
                dialogId: dialogId.toString(),
                step: 'onDialogRetrieved',
                phase: 'processing',
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

            logger.addContext({
              phase: 'processing',
              progress,
              dialogsRetrieved,
            })
            logger.info('Dialog retrieved', {
              dialogId: dialogId.toString(),
              step: 'onDialogRetrieved',
            })
          } catch (err) {
            // Error occurred while updating progress during dialog retrieval
            logger.error('Error updating progress during dialog retrieval', {
              dialogId: dialogId.toString(),
              step: 'onDialogRetrieved',
              phase: 'processing',
              error: getErrorMessage(err),
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
              logger.warn('Job was canceled', {
                dialogId: dialogId.toString(),
                step: 'onMessagesRetrieved',
              })
              return
            }

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

            logger.addContext({ progress })
            logger.info('Messages retrieved for dialog', {
              dialogId: dialogId.toString(),
              step: 'onMessagesRetrieved',
              dialogProgress: percentage,
            })
          } catch (err) {
            // Error occurred while updating progress during messages retrieval
            logger.error('Error updating progress during messages retrieval', {
              dialogId: dialogId.toString(),
              step: 'onMessagesRetrieved',
              error: getErrorMessage(err),
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
            const amountOfStorageUsed = await getStorachaUsage(
              this.storacha,
              space
            )
            const newStorageUsage = amountOfStorageUsed + meta.size
            const shouldStopUpload = await isStorageLimitExceeded(
              this.storacha,
              newStorageUsage,
              this.#dbUser.storachaAccount as AccountDID
            )

            if (amountOfStorageUsed && shouldStopUpload) {
              logger.warn('Backup storage limit exceeded', {
                step: 'onShardStored',
                phase: 'processing',
                dialogId,
                totalSize: newStorageUsage,
              })

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
              logger.addContext({ phase: 'finalizing', totalBytesUploaded })
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

            logger.info('Shard stored', {
              step: 'onShardStored',
              progress,
              totalBytesUploaded,
            })
          } catch (err) {
            // Error occurred while updating progress during shard storage
            logger.error('Error updating progress during shard storage', {
              step: 'onShardStored',
              phase: 'error',
              error: getErrorMessage(err),
            })

            if (!onShardStoredError) {
              onShardStoredError = new Error(
                `Failed to upload shard for dialog ${dialogId}.`,
                { cause: err }
              )
            }

            // TODO: this does not halt the upload process, it still uploads the shards
            throw onShardStoredError
          }
        },
      })

      // Since throwing on onShardStored does not halt the backup process, we at least register the job as failed, but the shards will still be uploaded.
      if (onShardStoredError) throw onShardStoredError

      const userPointsBefore = this.#dbUser.points
      // Only award points after successful backup completion
      const pointsEarned = totalBytesUploaded * mRachaPointsPerByte
      this.#dbUser = await this.#db.incrementUserPoints(
        this.#dbUser.id,
        pointsEarned
      )

      logger.info('Backup job completed! Awarded points to user', {
        step: 'jobPointsAward',
        pointsBefore: userPointsBefore,
        pointsEarned: this.#dbUser.points,
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

      logger.info('Job completed', {
        step: 'jobComplete',
        phase: 'complete',
      })
    } catch (err) {
      if (gracefulShutdown.isShutdownInitiated()) {
        logger.warn('Job interrupted by shutdown, will be requeued', {
          jobId: id,
        })
      } else {
        logger.error('Backup job failed', {
          step: 'jobFailed',
          phase: 'error',
          error: getErrorMessage(err),
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
    } finally {
      gracefulShutdown.unregisterActiveJob(request.jobID)
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

    const logger = createLogger({
      jobId: request.jobID,
      dialogId: request.dialogID,
      userId: this.#dbUser.id,
    })

    // Validates that the job exists and is in 'completed' status
    if (job.status != 'completed') {
      throw new Error(`job is not completed: ${request.jobID}`)
    }

    const { dialogs } = job.params
    if (!dialogs[request.dialogID]) {
      throw new Error(`dialog not found in job: ${request.dialogID}`)
    }

    const userPointsBefore = this.#dbUser.points
    let pointsToSubtract = dialogs[request.dialogID].sizeRewardInfo?.points || 0
    const dialogSize = dialogs[request.dialogID].sizeRewardInfo?.size || 0
    delete dialogs[request.dialogID]

    logger.info('Deleting dialog backup from job', {
      dialogPoints: pointsToSubtract,
      dialogSize,
    })

    try {
      // is this dialog the only dialog in the job?
      if (Object.keys(dialogs).length === 0) {
        logger.info('Deleting entire job because it has no dialogs left')
        const cid = CID.parse(job.data)

        try {
          await this.storacha.remove(cid, { shards: true })
        } catch (err) {
          // @ts-expect-error err.cause doesn't typecheck
          const errorName = (err.cause.name || '') as string
          if (errorName === 'UploadNotFound') {
            logger.warn('Upload not found, removing job from DB')
          } else {
            throw new Error(
              `Failed to delete job ${request.jobID} with data ${job.data}`,
              { cause: err }
            )
          }
        }

        await this.#db.deleteJob(request.jobID, this.#dbUser.id)
        pointsToSubtract = job.points
        logger.info('Deleted job and its backup data')
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
        logger.info('Subtracted points from user', {
          pointsBefore: userPointsBefore,
          pointsAfter: this.#dbUser.points,
        })
      }
    } catch (err) {
      throw new Error(
        `Failed to delete dialog ${request.dialogID} from job ${request.jobID}`,
        { cause: err }
      )
    }
  }
}
