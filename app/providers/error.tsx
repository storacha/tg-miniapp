import ErrorModal from '@/components/ui/error-modal'
import { getErrorMessage } from '@/lib/errorhandling'
import { useSentryContext } from '@/hooks/useSentryContext'
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
} from 'react'

interface ErrorOptions {
  title?: string
  onClose?: () => void
}

interface ErrorState {
  message: string
  title?: string
  onClose?: () => void
}

export interface ContextActions {
  setError: (error: unknown | null, options?: ErrorOptions) => void
}

export type ContextValue = ContextActions

export const ContextDefaultValue: ContextValue = {
  setError: () => {
    throw new Error('provider not setup')
  },
}

export const Context = createContext<ContextValue>(ContextDefaultValue)

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setErrorState] = useState<ErrorState | null>(null)
  const { captureError } = useSentryContext()

  const setError = useCallback(
    (err: unknown | null, options: ErrorOptions = {}) => {
      if (!err) {
        setErrorState(null)
        return
      }
      const { title, onClose } = options
      if (err instanceof Error) {
        setErrorState({
          message: getErrorMessage(err),
          title,
          onClose,
        })
        captureError(err, {
          tags: { component: 'ErrorProvider' },
          extra: { title },
        })
      } else {
        const message = typeof err === 'string' ? err : getErrorMessage(err)
        setErrorState({
          message,
          title,
          onClose,
        })
      }
    },
    [captureError]
  )

  const handleClose = useCallback(() => {
    setErrorState((prev) => {
      if (prev?.onClose) {
        prev.onClose()
      }
      return null
    })
  }, [])

  const contextValue = useMemo(() => ({ setError }), [setError])

  return (
    <Context.Provider value={contextValue}>
      {children}
      <ErrorModal
        open={!!error}
        title={error?.title}
        message={error?.message}
        setOpen={(open) => !open && handleClose()}
      />
    </Context.Provider>
  )
}

export const useError = (): ContextValue => useContext(Context)
