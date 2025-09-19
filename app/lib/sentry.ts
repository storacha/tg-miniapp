import {
  captureException,
  withScope,
  addBreadcrumb,
  Breadcrumb,
} from '@sentry/nextjs'

/**
 * Enhanced error logging and capture for Sentry with context support.
 *
 * @param err the error - typed as unknown to match catch(err)
 * @param context optional context to add to the error report
 */
export function logAndCaptureError(
  err: unknown,
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, unknown>
    user?: { accountDID?: string; telegramId?: string }
  }
) {
  console.error(err)
  try {
    withScope((scope) => {
      // Add tags
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value)
        })
      }

      // Add extra context
      if (context?.extra) {
        scope.setContext('extra', context.extra)
      }

      // Add user context
      if (context?.user) {
        scope.setUser({
          accountDID: context.user.accountDID,
          telegram_id: context.user.telegramId,
        })
      }

      captureException(err)
    })
  } catch (e) {
    console.error('error sending error to Sentry:', err)
    console.error("the error from Sentry's captureException is:", e)
  }
}

/**
 * Log a message and add a Sentry breadcrumb
 * @param message The log message
 * @param breadcrumb Breadcrumb context
 */
export function logAndAddContext(
  message: string,
  breadcrumb?: Omit<Breadcrumb, 'message'>
) {
  console.log(message)
  try {
    if (breadcrumb) {
      addBreadcrumb({ message, ...breadcrumb })
    }
  } catch (error) {
    console.error('Error adding breadcrumb:', error)
  }
}
