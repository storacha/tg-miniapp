import { ExecuteJobRequest } from '@/api'
import { getDB } from './db'
import { createLogger } from './logger'
import { queueFn } from '@/lib/server/queue'
import pMap from 'p-map'
import { Result } from '@ucanto/core/schema'

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const __storacha_graceful_shutdown_listener_registered__: boolean | undefined
}

export interface IGracefulShutdownManager {
  isShutdownInitiated(): boolean
  registerActiveJob(
    jobRequest: ExecuteJobRequest,
    telegramCleanup: () => Promise<void>
  ): Promise<void>
  unregisterActiveJob(jobId: string): Promise<void>
}

const logger = createLogger({ module: 'graceful-shutdown' })

interface ActiveJob {
  request: ExecuteJobRequest
  telegramCleanup: () => Promise<void>
}

class GracefulShutdownManager implements IGracefulShutdownManager {
  private _isShuttingDown = false
  private _activeJobs = new Map<string, ActiveJob>()

  startShuttingDown() {
    this._isShuttingDown = true
  }

  isShutdownInitiated() {
    return this._isShuttingDown
  }

  get activeJobs() {
    return this._activeJobs
  }

  async registerActiveJob(
    jobRequest: ExecuteJobRequest,
    telegramCleanup: () => Promise<void>
  ) {
    this._activeJobs.set(jobRequest.jobID, {
      request: jobRequest,
      telegramCleanup,
    })
  }

  async unregisterActiveJob(jobId: string) {
    this._activeJobs.delete(jobId)
  }
}

class LocalGracefulShutdownManager extends GracefulShutdownManager {
  private shutdownPromise?: Promise<void>

  constructor() {
    super()
    // Ensure signal handlers are only registered once
    const GLOBAL_FLAG = '__storacha_graceful_shutdown_listener_registered__'
    if (!globalThis[GLOBAL_FLAG as keyof typeof globalThis]) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore setting dynamic global property
      globalThis[GLOBAL_FLAG] = true
      logger.info('Registering GracefulShutdown listener')
      process.on('SIGTERM', () => this.initiateShutdown()) // Listen for SIGTERM from ECS
      process.on('SIGINT', () => this.initiateShutdown())
    } else {
      logger.info('GracefulShutdown listener already registered, skipping')
    }
  }

  private async initiateShutdown() {
    if (this.isShutdownInitiated()) return this.shutdownPromise

    this.startShuttingDown()
    logger.info('Graceful shutdown initiated', {
      activeJobCount: this.activeJobs.size,
    })

    this.shutdownPromise = this.performShutdown()
    return this.shutdownPromise
  }

  private async performShutdown() {
    try {
      logger.info('Stopping acceptance of new job requests') //  the jobs/route endpoint will reject new requests

      const jobEntries = Array.from(this.activeJobs.entries())
      await pMap(
        jobEntries,
        async ([jobId, activeJob]) =>
          this.processJobForShutdown(jobId, activeJob),
        {
          concurrency: 5, // Process max 5 jobs simultaneously
          stopOnError: false, // Continue even if some jobs fail
        }
      )
      this.activeJobs.clear()

      logger.info('Graceful shutdown completed successfully')
    } catch (error) {
      logger.error('Error during graceful shutdown', { error })
    } finally {
      process.exit(0)
    }
  }

  private async processJobForShutdown(jobId: string, activeJob: ActiveJob) {
    await this.disconnectTelegramClient(jobId, activeJob)
    await this.markJobAsQueued(jobId)
    await this.requeueActiveJob(jobId, activeJob)
  }

  private async markJobAsQueued(jobId: string) {
    try {
      logger.info('Updating job status', { jobId })
      const db = getDB()
      await db.setJobAsQueued(jobId) // this also sets the progress and startedAt to null
      logger.info('Job status updated successfully', { jobId })
    } catch (error) {
      logger.error('db.setJobAsQueued failed', { jobId, error })
    }
  }

  private async disconnectTelegramClient(jobId: string, activeJob: ActiveJob) {
    try {
      logger.info('Disconnecting Telegram client')
      await activeJob.telegramCleanup()
      logger.info('Telegram client disconnected successfully', { jobId })
    } catch (error) {
      logger.error('Failed to disconnect Telegram client', { jobId, error })
    }
  }

  private async requeueActiveJob(jobId: string, activeJob: ActiveJob) {
    try {
      logger.info('Requeuing active job', { jobId, request: activeJob.request })
      await queueFn(activeJob.request)
      logger.info('Job successfully requeued', { jobId })
    } catch (error) {
      logger.error('Failed to requeue job', { jobId, error })
    }
  }
}

interface ProtectionStatus {
  ExpirationDate: string
  ProtectionEnabled: boolean
  TaskArn: string
}

class AwsGracefulShutdownManager extends GracefulShutdownManager {
  async _setProtectionEnabled(
    enabled: boolean
  ): Promise<Result<ProtectionStatus, Error>> {
    try {
      const resp = await fetch(
        `${process.env.ECS_AGENT_URI}/task-protection/v1/state`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            enabled
              ? {
                  ProtectionEnabled: true,
                  ExpiresInMinutes: 45,
                }
              : { ProtectionEnabled: false }
          ),
        }
      )
      const respObj = await resp.json()
      if (respObj.failure) {
        return {
          error: new Error(
            `Failed to set task protection: ${respObj.failure.Reason}`
          ),
        }
      }
      if (respObj.error) {
        return {
          error: new Error(
            `Failed to set task protection: ${respObj.error.Message}`
          ),
        }
      }
      return { ok: respObj.protection }
    } catch (error) {
      if (error instanceof Error) {
        return { error }
      } else {
        return { error: new Error('Unknown error setting task protection') }
      }
    }
  }

  async unregisterActiveJob(jobId: string): Promise<void> {
    await super.unregisterActiveJob(jobId)
    // If no active jobs remain, we can disable task protection
    if (this.activeJobs.size === 0) {
      const result = await this._setProtectionEnabled(false)
      if (result.error) {
        logger.error('Failed to disable task protection', {
          error: result.error,
        })
      } else {
        logger.info('Task protection disabled', { protection: result.ok })
      }
    }
  }
  async registerActiveJob(
    jobRequest: ExecuteJobRequest,
    telegramCleanup: () => Promise<void>
  ): Promise<void> {
    await super.registerActiveJob(jobRequest, telegramCleanup)
    // In AWS ECS, we protect against scale-in termination when a job is active
    // we use a 45 minute expiration, and calling this has the effect of "re-upping" the timer
    // so as long as we have active jobs, we should be protected
    const result = await this._setProtectionEnabled(true)
    if (result.error) {
      logger.error('Failed to enable task protection', {
        error: result.error,
      })
    } else {
      logger.info('Task protection enabled', { protection: result.ok })
    }
  }
}

export const gracefulShutdown: IGracefulShutdownManager = process.env
  .ECS_AGENT_URI
  ? new AwsGracefulShutdownManager()
  : new LocalGracefulShutdownManager()
