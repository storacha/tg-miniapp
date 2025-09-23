'use client'
import { useEffect } from 'react'
import { logAndCaptureError } from '@/lib/sentry'

export function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset?: () => void
}) {
  useEffect(() => {
    logAndCaptureError(error, {
      tags: { component: 'ErrorPage' },
      extra: { digest: error.digest },
    })
  }, [error])

  // Detect Telegram Mini App environment
  const isOutsideTelegram = error?.message?.includes(
    'Could not initialized TG SDK'
  )

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-white">
      <img
        src="/fail-racha.png"
        width="112"
        alt="Error"
        className="inline-block mb-5"
      />

      <h2 className="text-xl font-semibold text-red-600 mb-4">
        {isOutsideTelegram
          ? 'This app can only be used inside Telegram.'
          : 'An unexpected error occurred'}
      </h2>

      <blockquote className="bg-red-100 text-red-800 text-sm p-4 rounded w-full max-w-md break-words mb-6">
        <code>
          {isOutsideTelegram
            ? 'Please open this link from the Telegram app using the official Mini App integration.'
            : error.message}
        </code>
      </blockquote>

      {!isOutsideTelegram && (
        <button
          type="button"
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded w-full max-w-xs"
          onClick={() => (reset ? reset() : window.location.reload())}
        >
          {reset ? 'Try Again' : 'Reload Page'}
        </button>
      )}
    </div>
  )
}
