import React, { useState } from 'react'
import { PricingTable } from '../pricing-table'
import { formatBytes } from '@/lib/utils'
import { MAX_FREE_BYTES } from '@/lib/server/constants'
import { XIcon } from 'lucide-react'

type ErrorModalProps = {
  title?: string
  message?: string
  onClose?: () => void
  open?: boolean
  setOpen?: (open: boolean) => void
}

export default function ErrorModal({
  title,
  message,
  onClose,
  open = false,
  setOpen,
}: ErrorModalProps) {
  const [showPlans, setShowPlans] = useState<boolean>(false)
  if (!open) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && setOpen) {
      setOpen(false)
    }
  }

  const isStorageError =
    message?.toLowerCase().includes('storage') &&
    message?.includes(`${formatBytes(MAX_FREE_BYTES)}`)

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-red-50 border border-red-600 rounded-xl p-6 w-11/12 max-w-sm text-center shadow-lg overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {showPlans ? (
          <div className="relative">
            <button
              className="absolute -top-5 -right-5"
              onClick={() => setShowPlans(false)}
            >
              <XIcon size="30" color="#000" />
            </button>
            <PricingTable />
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {title || 'Oops!'}
            </h2>
            <img
              src="/fail-racha.png"
              alt="Error illustration"
              className="mx-auto mb-5 w-28"
            />
            <p className="text-sm text-gray-700 mb-6">
              {message || 'Something went wrong. Please try again.'}
            </p>
            <div className="flex flex-col gap-3">
              {isStorageError && (
                <button
                  onClick={() => setShowPlans(true)}
                  className="bg-yellow-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-yellow-700 transition"
                >
                  Upgrade Plan
                </button>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-red-700 transition"
                >
                  Try again
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
