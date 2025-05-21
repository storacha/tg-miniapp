import { createContext, useContext, ReactNode, PropsWithChildren, useState, useCallback, useEffect } from 'react'
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
  loadingDialogs: boolean
}

export interface ContextActions {
  getMe: () => Promise<string>
}

export type ContextValue = [state: ContextState, actions: ContextActions]

export const ContextDefaultValue: ContextValue = [
  {
    launchParams: { platform: '', themeParams: {}, version: '' },
    user: undefined,
    dialogs: [],
    loadingDialogs: false,
  },
  {
    getMe: () => Promise.reject(new Error('provider not setup')),
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
  const [offsetParams, setOffsetParams] = useState<{limit: number, offsetId?: number, offsetDate?: number, offsetPeer?: string}>({ limit: 10 })
	const [hasMore, setHasMore] = useState(true)
  const [loadingDialogs, setLoadingDialogs] = useState(false)

  useEffect(() => {
		if (!tgSessionString || !hasMore) return

		let cancel = false;
		
		(async () => {
			try {
				setLoadingDialogs(true)

				const { chats, offsetParams: newOffsetParams } = await listDialogs(offsetParams)
				if (cancel) return

				setDialogs([...dialogs, ...chats])
				setOffsetParams({...newOffsetParams, limit: 100})
				setHasMore(chats.length > 0)
			} catch (err) {
				console.error('Failed to fetch dialogs:', err)
			} finally {
				if (!cancel) setLoadingDialogs(false)
			}
		})()

		return () => {
			cancel = true
		}
	}, [tgSessionString, offsetParams])


  const listDialogs = useCallback(
      async (paginationParams = { limit: 10 }) => {
        if (!tgSessionString) return { chats: [], offsetParams: {} }
        return listDialogsRequest(tgSessionString, paginationParams )
      },
      [tgSessionString]
  )
  
  const getMe = useCallback(
    async () => {
      if (!tgSessionString) return '0'
      return getMeRequest(tgSessionString)
    },
    []
  )

  return (
    <Context.Provider value={[{ user, launchParams, dialogs, loadingDialogs}, { getMe }]}>
      {children}
    </Context.Provider>
  )
}

export const useTelegram = (): ContextValue => useContext(Context)
