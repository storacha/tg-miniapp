import { ExecuteJobRequest, Job } from '@/api'
import { getDB } from './db'
import { createLogger } from './logger'
import { queueFn } from '@/components/server'
import pMap from 'p-map'

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
    process.on('SIGTERM', () => this.initiateShutdown()) // Listen for SIGTERM from ECS
    process.on('SIGINT', () => this.initiateShutdown())
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

      await pMap(
        this.activeJobs.entries(),
        ([jobId, activeJob]) => this.processJobForShutdown(jobId, activeJob),
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
    const db = getDB()

    try {
      logger.info('Disconnecting Telegram client')
      await activeJob.telegramCleanup()

      logger.info('Requeuing active job', { jobId })
      await queueFn(activeJob.request)

      logger.info('Updating job status', { jobId })
      await db.updateJob(jobId, {
        status: 'queued',
        updated: Date.now(),
      } as Job) // this also sets the progress and startedAt to null
    } catch (error) {
      logger.error('Failed to requeue job', { jobId, error })
    }
  }
}

export const gracefulShutdown = new GracefulShutdownManager()
