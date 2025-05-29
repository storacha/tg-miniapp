import ErrorModal from '@/components/ui/error-modal'
import React, { createContext, useContext, useState, ReactNode } from 'react'

export interface ContextActions {
    setError: (msg: string | null) => void
}

export type ContextValue = ContextActions

export const ContextDefaultValue: ContextValue = {
    setError: () => {throw new Error('provider not setup')},
}

export const Context = createContext<ContextValue>(ContextDefaultValue)

export function ErrorProvider({ children }: { children: ReactNode }) {
    const [error, setErrorState] = useState<string | null>(null)

    const setError = (msg: string | null) => setErrorState(msg)
    const handleClose = () => setErrorState(null)

    return (
        <Context.Provider value={{ setError }}>
            {children}
        <ErrorModal open={!!error} message={error || ''} setOpen={open => !open && handleClose()} />
        </Context.Provider>
    )
}

export const useError = (): ContextValue => useContext(Context)
