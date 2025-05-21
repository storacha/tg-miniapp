import { createContext, useContext, ReactNode, PropsWithChildren, useState, useCallback } from 'react'
import { LaunchParams, useLaunchParams, initData, User, useSignal } from '@telegram-apps/sdk-react'
import { Session } from '@/vendor/telegram/sessions/Abstract'
import { TelegramClientParams } from '@/vendor/telegram/client/telegramBaseClient'
import { listDialogs as listDialogsRequest, getMe as getMeRequest } from '../components/server'
import { useGlobal } from '@/zustand/global'
import { DialogInfo } from '@/api'

export interface ContextState {
  launchParams: LaunchParams
  user?: User
  dialogs: DialogInfo[]
}

export interface ContextActions {
  setDialogs: (dialogs: DialogInfo[]) => void
  listDialogs: (paginationParams?: { limit: number, offsetId?: number, offsetDate?: number, offsetPeer?: string }) => Promise<{ chats: any[], offsetParams: any }>
  getMe: () => Promise<string>
}

export type ContextValue = [state: ContextState, actions: ContextActions]

export const ContextDefaultValue: ContextValue = [
  {
    launchParams: { platform: '', themeParams: {}, version: '' },
    user: undefined,
    dialogs: []
  },
  {
    listDialogs: () => Promise.reject(new Error('provider not setup')),
    getMe: () => Promise.reject(new Error('provider not setup')),
    setDialogs: () => Promise.reject(new Error('provider not setup'))
  },
]

export const Context = createContext<ContextValue>(ContextDefaultValue)

export interface ProviderProps extends PropsWithChildren {
  apiId: number
  apiHash: string
  clientParams?: TelegramClientParams
  session?: Session
}

/**
 * Provider that adds launch params, init data and and exposes dialogs to
 * the context.
 */
export const Provider = ({ apiId, apiHash, session, clientParams, children }: ProviderProps): ReactNode => {
  const {tgSessionString} = useGlobal()
  const user = useSignal(initData.user)
  const launchParams = useLaunchParams()
  const [dialogs, setDialogs] = useState<DialogInfo[]>([])
  
  // useEffect(() => {
  //   session = session ?? (typeof localStorage !== 'undefined' ? new StoreSession(defaultSessionName) : new StringSession())
  //   const params = { ...defaultClientParams, ...clientParams }
  //   setClient(new TelegramClient(session, apiId, apiHash, params))
  // }, [apiId, apiHash, session, clientParams])

  // if (!client) {
  //   return null
  // }

  const listDialogs = useCallback(
      async (paginationParams = { limit: 10 }) => {
       console.log('list dialogs')
        if (!tgSessionString) return { chats: [], offsetParams: {} }
        return listDialogsRequest(tgSessionString, paginationParams )
      },
      [tgSessionString]
    )
  
  const getMe = useCallback(
    async () => {
      console.log('get Me')
      if (!tgSessionString) return '0'
      return getMeRequest(tgSessionString)
    },
    []
  )

  return (
    <Context.Provider value={[{ user, launchParams, dialogs}, {listDialogs, getMe, setDialogs}]}>
      {children}
    </Context.Provider>
  )
}

export const useTelegram = (): ContextValue => useContext(Context)
