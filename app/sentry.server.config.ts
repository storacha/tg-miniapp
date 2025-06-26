// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://66656c7520b40c734dc0b5bd84b92a4d@o609598.ingest.us.sentry.io/4509561976455168',

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
})
