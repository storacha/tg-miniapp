import { createContext, useContext, ReactNode, PropsWithChildren, useState, useEffect, useCallback } from 'react'
import { TelegramClient } from '@/vendor/telegram'
import { LaunchParams, useLaunchParams, initData, User, useSignal, cloudStorage } from '@telegram-apps/sdk-react'
import { Session } from '@/vendor/telegram/sessions/Abstract'
import { StoreSession, StringSession } from '@/vendor/telegram/sessions'
import { TelegramClientParams } from '@/vendor/telegram/client/telegramBaseClient'

const defaultSessionName = 'tg-session'
const defaultClientParams: TelegramClientParams = { connectionRetries: 5 }

export type SessionState = SessionStateLoading | SessionStateLoaded

export interface BaseSessionState {
  loaded: boolean
}

export interface SessionStateLoading extends BaseSessionState {
  loaded: false
}

export interface SessionStateLoaded extends BaseSessionState {
  loaded: true
  session: string
}

export interface ContextState {
  initData: string
  user?: User
  sessionState: SessionState
}

export interface ContextActions {
  recordSession: (session: string) => Promise<void>
}

export type ContextValue = [state: ContextState, actions: ContextActions]

export const ContextDefaultValue: ContextValue = [
  {
    initData: '',
    user: undefined,
    sessionState: { loaded: false}
  },
  {
    recordSession: (session: string) => Promise.resolve()
  },
]

export const Context = createContext<ContextValue>(ContextDefaultValue)

export interface ProviderProps extends PropsWithChildren {
}

/**
 * Provider that adds launch params, init data and a Telegram client instance to
 * the context.
 */
export const Provider = ({  children }: ProviderProps): ReactNode => {
  const launchParams = useLaunchParams()
  const user = useSignal(initData.user)
  const [sessionState, setSessionState] = useState<SessionState>({ loaded: false}) 
  useEffect(() => {
    (async () => {
      const session = await cloudStorage.getItem('telegram-session')
      setSessionState({ loaded: true, session })
    })()
  }) 

  const recordSession = async (session: string) => {
    await cloudStorage.setItem('telegram-session', session)
    setSessionState({ loaded: true, session})
  }

  return (
    <Context.Provider value={[{ sessionState, user, initData: launchParams.initDataRaw || '' }, { recordSession }]}>
      {children}
    </Context.Provider>
  )
}

export const useTelegram = (): ContextValue => useContext(Context)
