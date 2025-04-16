import { createContext, useContext, ReactNode, PropsWithChildren, useState, useEffect } from 'react'
import { TelegramClient } from '@/vendor/telegram'
import { LaunchParams, useLaunchParams, initData, User, useSignal } from '@telegram-apps/sdk-react'
import { Session } from '@/vendor/telegram/sessions/Abstract'
import { StoreSession, StringSession } from '@/vendor/telegram/sessions'
import { TelegramClientParams } from '@/vendor/telegram/client/telegramBaseClient'

const defaultSessionName = 'tg-session'
const defaultClientParams: TelegramClientParams = { connectionRetries: 5 }

export interface ContextState {
  launchParams: LaunchParams
  user?: User
  client: TelegramClient
}

export interface ContextActions {}

export type ContextValue = [state: ContextState, actions: ContextActions]

export const ContextDefaultValue: ContextValue = [
  {
    launchParams: { platform: '', themeParams: {}, version: '' },
    user: undefined,
    // @ts-expect-error not a client instance
    client: {},
  },
  {},
]

export const Context = createContext<ContextValue>(ContextDefaultValue)

export interface ProviderProps extends PropsWithChildren {
  apiId: number
  apiHash: string
  clientParams?: TelegramClientParams
  session?: Session
}

/**
 * Provider that adds launch params, init data and a Telegram client instance to
 * the context.
 */
export const Provider = ({ apiId, apiHash, session, clientParams, children }: ProviderProps): ReactNode => {
  const [client, setClient] = useState<TelegramClient>()
  const launchParams = useLaunchParams()
  const user = useSignal(initData.user)

  useEffect(() => {
    session = session ?? (typeof localStorage !== 'undefined' ? new StoreSession(defaultSessionName) : new StringSession())
    const params = { ...defaultClientParams, ...clientParams }
    setClient(new TelegramClient(session, apiId, apiHash, params))
  }, [apiId, apiHash, session, clientParams])

  if (!client) {
    return null
  }

  return (
    <Context.Provider value={[{ client, user, launchParams }, {}]}>
      {children}
    </Context.Provider>
  )
}

export const useTelegram = (): ContextValue => useContext(Context)
