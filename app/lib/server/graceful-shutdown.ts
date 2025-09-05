import { ExecuteJobRequest } from '@/api'
import { getDB } from './db'
import { createLogger } from './logger'
import { queueFn } from '@/lib/server/queue'
import pMap from 'p-map'

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const __storacha_graceful_shutdown_listener_registered__: boolean | undefined
}

const logger = createLogger({ module: 'graceful-shutdown' })

interface ActiveJob {
  request: ExecuteJobRequest
  telegramCleanup: () => Promise<void>
}

export class GracefulShutdownManager {
  private isShuttingDown = false
  private activeJobs = new Map<string, ActiveJob>()
  private shutdownPromise?: Promise<void>

  constructor() {
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

  isShutdownInitiated(): boolean {
    return this.isShuttingDown
  }

  registerActiveJob(
    jobRequest: ExecuteJobRequest,
    telegramCleanup: () => Promise<void>
  ) {
    this.activeJobs.set(jobRequest.jobID, {
      request: jobRequest,
      telegramCleanup,
    })
  }

  unregisterActiveJob(jobId: string) {
    this.activeJobs.delete(jobId)
  }

  private async initiateShutdown() {
    if (this.isShuttingDown) return this.shutdownPromise

    this.isShuttingDown = true
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
    await this.requeueActiveJob(jobId, activeJob)
    await this.markJobAsQueued(jobId)
    await this.disconnectTelegramClient(jobId, activeJob)
  }

  private async markJobAsQueued(jobId: string) {
    const db = getDB()

    try {
      logger.info('Updating job status', { jobId })
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
    } catch (error) {
      logger.error('Failed to disconnect Telegram client', { jobId, error })
    }
  }

  private async requeueActiveJob(jobId: string, activeJob: ActiveJob) {
    try {
      logger.info('Requeuing active job', { jobId, request: activeJob.request })
      await queueFn(activeJob.request)
    } catch (error) {
      logger.error('Failed to requeue job', { jobId, error })
    }
  }
}

export const gracefulShutdown = new GracefulShutdownManager()
