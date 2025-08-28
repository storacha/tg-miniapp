import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')

    // Add global error handlers for background jobs
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason)
      Sentry.captureException(reason)
    })

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error)
      Sentry.captureException(error)
      // Don't exit immediately to allow Sentry to flush
      setTimeout(() => process.exit(1), 1000)
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
