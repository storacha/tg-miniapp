import ErrorModal from '@/components/ui/error-modal'
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
  setError: (error: string | null, options?: ErrorOptions) => void
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

  const setError = useCallback(
    (msg: string | null, options: ErrorOptions = {}) => {
      if (!msg) {
        setErrorState(null)
        return
      }

      const { title, onClose } = options
      setErrorState({
        message: msg,
        title,
        onClose,
      })
    },
    []
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
