import { captureException } from '@sentry/nextjs'

/**
 * Log to the error console and capture the error in Sentry.
 *
 * @param err the error - typed as unknown to match catch(err)
 */
export function logAndCaptureError(err: unknown) {
  console.error(err)
  try {
    captureException(err)
  } catch (e) {
    console.error('error sending error to Sentry:', err)
    console.error("the error from Sentry's captureException is:", e)
  }
}
