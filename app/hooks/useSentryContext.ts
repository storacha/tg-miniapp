import { useCallback } from 'react'
import { useGlobal } from '@/zustand/global'
import { logAndCaptureError } from '@/lib/sentry'

/**
 * Hook to provide Sentry error reporting with context
 */
export function useSentryContext() {
  const { user } = useGlobal()

  const captureError = useCallback(
    (
      error: unknown,
      additionalContext?: {
        tags?: Record<string, string>
        extra?: Record<string, any>
      }
    ) => {
      const context = {
        ...additionalContext,
        user: {
          telegramId: user?.id?.toString(),
          accountDID: user?.accountDID,
        },
        tags: {
          ...additionalContext?.tags,
        },
      }

      logAndCaptureError(error, context)
    },
    [user]
  )

  return {
    captureError,
  }
}
