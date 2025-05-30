import ErrorModal from '@/components/ui/error-modal'
import React, { createContext, useContext, useState, ReactNode } from 'react'

interface ErrorOptions {
  title?: string
  autoClose?: boolean
  duration?: number
  onClose?: () => void
}

interface ErrorState {
  message: string
  title?: string
  onClose?: () => void
}

export interface ContextActions {
    setError: (error: string | null,  options?: ErrorOptions) => void
}

export type ContextValue = ContextActions

export const ContextDefaultValue: ContextValue = {
    setError: () => {throw new Error('provider not setup')},
}

export const Context = createContext<ContextValue>(ContextDefaultValue)

export function ErrorProvider({ children }: { children: ReactNode }) {
    const [error, setErrorState] = useState<ErrorState | null>(null)

    const setError = (msg: string | null, options: ErrorOptions = {}) => {
        const { title, autoClose = false, duration = 5000, onClose } = options
        setErrorState({
            message: msg || '',
            title,
            onClose: () => {
                if (onClose) onClose()
                setErrorState(null)
            }
        })

        if (autoClose) {
            setTimeout(() => {
                handleClose()
            }, duration)
        }
    }

    const handleClose = () => {
        if (error?.onClose) {
            error.onClose()
        }
        setErrorState(null)
    }

    return (
        <Context.Provider value={{ setError }}>
            {children}
        <ErrorModal 
            open={!!error}
            title={error?.title}
            message={error?.message} 
            setOpen={open => !open && handleClose()} 
        />
        </Context.Provider>
    )
}

export const useError = (): ContextValue => useContext(Context)
