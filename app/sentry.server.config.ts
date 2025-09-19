// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Set sample rate for error events
  sampleRate: 1.0,

  // Configure tracing - lower rate for production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Add default tags for the server runtime
  initialScope: {
    tags: {
      runtime: 'server',
    },
  },

  // Enhanced error filtering for server-side
  beforeSend(event, hint) {
    // Filter out common network timeout errors
    if (
      event.message?.includes('ECONNRESET') ||
      event.message?.includes('ETIMEDOUT') ||
      event.message?.includes('TIMEOUT')
    ) {
      return null
    }

    return event
  },
})
