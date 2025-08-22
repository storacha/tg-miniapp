import { ExecuteJobRequest, Job } from '@/api'
import { getDB } from './db'
import { createLogger } from './logger'
import { queueFn } from '@/components/server'

const logger = createLogger({ module: 'graceful-shutdown' })

export class GracefulShutdownManager {
  private isShuttingDown = false
  private activeJobs = new Map<string, ExecuteJobRequest>()
  private shutdownPromise?: Promise<void>

  constructor() {
    process.on('SIGTERM', () => this.initiateShutdown()) // Listen for SIGTERM from ECS
    process.on('SIGINT', () => this.initiateShutdown())
  }

  isShutdownInitiated(): boolean {
    return this.isShuttingDown
  }

  registerActiveJob(jobRequest: ExecuteJobRequest) {
    this.activeJobs.set(jobRequest.jobID, jobRequest)
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

      await this.requeueActiveJobs()
      await this.disconnectTelegramClients()

      logger.info('Graceful shutdown completed successfully')
    } catch (error) {
      logger.error('Error during graceful shutdown', { error })
    } finally {
      process.exit(0)
    }
  }

  private async requeueActiveJobs() {
    const db = getDB()

    for (const [jobId, jobRequest] of this.activeJobs) {
      try {
        logger.info('Requeuing active job', { jobId })

        await queueFn(jobRequest)

        await db.updateJob(jobId, {
          status: 'queued',
          updated: Date.now(),
        } as Job) // this also sets the progress and startedAt to null
      } catch (error) {
        logger.error('Failed to requeue job', { jobId, error })
      }
    }
  }

  private async disconnectTelegramClients() {
    // TODO: Implement telegram client cleanup
    // need to track active telegram connections and disconnect them
    logger.info('Disconnecting Telegram clients')
  }
}

export const gracefulShutdown = new GracefulShutdownManager()
