// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Set sample rate for error events
  sampleRate: 1.0,

  // Configure tracing
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  replaysOnErrorSampleRate: 1.0, // Capture replays when an error occurs
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // Capture sessions for replays

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true, // mask all text content
      blockAllMedia: true, // block all media content (images, videos, etc.)
    }),
    Sentry.thirdPartyErrorFilterIntegration({
      filterKeys: ['tg-miniapp'],
      behaviour: 'apply-tag-if-contains-third-party-frames',
    }),
  ],

  // Add default tags for the Telegram miniapp
  initialScope: {
    tags: {
      runtime: 'client',
    },
  },

  // Enhanced error filtering
  beforeSend(event, hint) {
    // Filter out network errors that are user-cancellations
    const error = hint.originalException
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'AbortError'
    ) {
      return null
    }

    // Filter out ResizeObserver loop errors (common in browsers)
    if (event.message?.includes('ResizeObserver loop limit exceeded')) {
      return null
    }

    return event
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
