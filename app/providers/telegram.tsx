import { createContext, useContext, ReactNode, PropsWithChildren, useState, useCallback, useEffect } from 'react'
import { LaunchParams, useLaunchParams, initData, User, useSignal } from '@telegram-apps/sdk-react'
import { listDialogs as listDialogsRequest, getMe as getMeRequest } from '../components/server'
import { useGlobal } from '@/zustand/global'
import { DialogInfo } from '@/api'
import { cloudStorage } from '@telegram-apps/sdk-react'
import { Session, StringSession } from '@/vendor/telegram/sessions'
import { Buffer } from "buffer/"

const CURRENT_VERSION = "1";
const defaultSessionName = 'tg-session'

export const saveSessionToString = (session?:  Session | string ) => {
  if (typeof session === 'string'){
    return session
  }
  // This code is copied from 
  // https://github.com/gram-js/gramjs/blob/master/gramjs/sessions/StringSession.ts#L95-L124
  // note that "Buffer" here is not node:buffer but the 'buffer' package
  if (!session || !session.authKey || !session.serverAddress || !session.port) {
    return ""
  }
  // TS is weird
  const key = session.authKey.getKey()
  if (!key) {
    return ""
  }
  const dcBuffer = Buffer.from([session.dcId])
  const addressBuffer = Buffer.from(session.serverAddress)
  const addressLengthBuffer = Buffer.alloc(2)
  addressLengthBuffer.writeInt16BE(addressBuffer.length, 0)
  const portBuffer = Buffer.alloc(2)
  portBuffer.writeInt16BE(session.port, 0)
  
  return (
    CURRENT_VERSION +
    StringSession.encode(
      Buffer.concat([
        dcBuffer,
        addressLengthBuffer,
        addressBuffer,
        portBuffer,
        key,
      ])
    )
  )
  }

export interface ContextState {
  user?: User
  launchParams: LaunchParams
  tgSessionString: string
  phoneNumber: string
  dialogs: DialogInfo[]
  loadingDialogs: boolean
  error: Error | null,
}

export interface ContextActions {
  logout: () => Promise<void>
  recordSession: (session: Session | string) => Promise<void>
  setPhoneNumber: (phone: string) => void
  getMe: () => Promise<string>
}

export type ContextValue = [state: ContextState, actions: ContextActions]

export const ContextDefaultValue: ContextValue = [
  {
    user: undefined,
    launchParams: { platform: '', themeParams: {}, version: '' },
    tgSessionString: '',
    phoneNumber: '',
    dialogs: [],
    loadingDialogs: false,
    error: null,
  },
  {
    logout: () => Promise.resolve(),
    recordSession: () => Promise.resolve(),
    setPhoneNumber: () => {},
    getMe: () => Promise.reject(new Error('provider not setup')),
  },
]

export const Context = createContext<ContextValue>(ContextDefaultValue)

/**
 * Provider that adds launch params, init data and and exposes dialogs to
 * the context.
 */
export const Provider = ({ children }: PropsWithChildren): ReactNode => {
  const user = useSignal(initData.user)
  const launchParams = useLaunchParams()
  const {tgSessionString, phoneNumber, setTgSessionString, setPhoneNumber, setIsTgAuthorized} = useGlobal()
  const [dialogs, setDialogs] = useState<DialogInfo[]>([])
  const [loadingDialogs, setLoadingDialogs] = useState(false)
  const [offsetParams, setOffsetParams] = useState<{limit: number, offsetId?: number, offsetDate?: number, offsetPeer?: string}>({ limit: 10 })
	const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
		if ( !tgSessionString || !hasMore ) return

		let cancel = false;
		
		(async () => {
			try {
        setError(null)
				setLoadingDialogs(true)
        
				const { chats, offsetParams: newOffsetParams } = await listDialogs(offsetParams)
				if (cancel) return

				setDialogs([...dialogs, ...chats])
				setOffsetParams({...newOffsetParams, limit: 100})
				setHasMore(chats.length > 0)
			} catch (err: any) {
				console.error('Failed to fetch dialogs:', err)
        setError(new Error('Failed to load dialogs. Please try again.', {cause: err}))
			} finally {
				if (!cancel) setLoadingDialogs(false)
			}
		})()

		return () => {
			cancel = true
		}
	}, [tgSessionString, offsetParams])

  const recordSession = async (session: Session | string ) => {
    console.log('recording Session')
    const sessionString = saveSessionToString(session)
    await cloudStorage.setItem(defaultSessionName, sessionString)
    setTgSessionString(sessionString)
    setIsTgAuthorized(true)
  }

  const logout = async () => {
    setPhoneNumber('')
		setTgSessionString('')
    setIsTgAuthorized(false)
    await cloudStorage.setItem(defaultSessionName, '')
  }

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
    <Context.Provider value={[{ 
      user, 
      launchParams, 
      tgSessionString, 
      phoneNumber,
      dialogs, 
      loadingDialogs, 
      error, 
    }, { getMe, recordSession, setPhoneNumber, logout }]}>
      {children}
    </Context.Provider>
  )
}

export const useTelegram = (): ContextValue => useContext(Context)
