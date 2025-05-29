import React from 'react'

type ErrorModalProps = {
  message?: string
  onClose?: () => void
  open?: boolean
  setOpen?: (open: boolean) => void
}

export default function ErrorModal({ message, onClose, open = false, setOpen }: ErrorModalProps) {
  if (!open) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && setOpen) {
      setOpen(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-red-50 border border-red-600 rounded-xl p-6 w-11/12 max-w-sm text-center shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Oops!</h2>
        <img
          src="/fail-racha.png"
          alt="Error illustration"
          className="mx-auto mb-5 w-28"
        />
        <p className="text-sm text-gray-700 mb-6">
          {message || 'Something went wrong. Please try again.'}
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
}