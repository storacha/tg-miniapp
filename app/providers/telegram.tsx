import {
  createContext,
  useContext,
  ReactNode,
  PropsWithChildren,
  useState,
  useCallback,
  useEffect,
} from 'react'
import {
  LaunchParams,
  useLaunchParams,
  initData,
  User,
  useSignal,
} from '@telegram-apps/sdk-react'
import {
  listDialogs as listDialogsRequest,
  getMe as getMeRequest,
  logout as logoutTelegram,
} from '../components/server'
import { useGlobal } from '@/zustand/global'
import { DialogInfo } from '@/api'
import { fromResult, getErrorMessage } from '@/lib/errorhandling'
import { useError } from './error'

export interface ContextState {
  launchParams: LaunchParams
  user?: User
  dialogs: DialogInfo[]
  loadingDialogs: boolean
  isTgAuthorized: boolean
  isValidating: boolean
}

export interface ContextActions {
  getMe: () => Promise<string | undefined>
  loadMoreDialogs: () => Promise<void>
  logout: () => Promise<void>
  setIsTgAuthorized: (isTgAuthorized: boolean) => void
}

export type ContextValue = [state: ContextState, actions: ContextActions]

export const ContextDefaultValue: ContextValue = [
  {
    launchParams: { platform: '', themeParams: {}, version: '' },
    user: undefined,
    dialogs: [],
    loadingDialogs: false,
    isTgAuthorized: false,
    isValidating: true,
  },
  {
    getMe: () => Promise.reject(new Error('provider not setup')),
    loadMoreDialogs: () => Promise.reject(new Error('provider not setup')),
    logout: () => Promise.reject(new Error('provider not setup')),
    setIsTgAuthorized: () => {
      throw new Error('provider not setup')
    },
  },
]

export const Context = createContext<ContextValue>(ContextDefaultValue)

/**
 * Provider that adds launch params, init data and and exposes dialogs to
 * the context.
 */
export const Provider = ({ children }: PropsWithChildren): ReactNode => {
  const { tgSessionString, setTgSessionString } = useGlobal()
  const [isTgAuthorized, setIsTgAuthorized] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const { setError } = useError()

  const user = useSignal(initData.user)
  const launchParams = useLaunchParams()

  const [dialogs, setDialogs] = useState<DialogInfo[]>([])
  const [offsetParams, setOffsetParams] = useState<{
    limit: number
    offsetId?: number
    offsetDate?: number
    offsetPeer?: string
  }>({ limit: 20 })
  const [hasMore, setHasMore] = useState(true)
  const [loadingDialogs, setLoadingDialogs] = useState(false)

  useEffect(() => {
    const validateSession = async () => {
      if (!tgSessionString) {
        setIsValidating(false)
        return
      }
      try {
        setIsValidating(true)
        fromResult(await getMeRequest(tgSessionString))
        console.log('Session is valid, user is authorized')
        setIsTgAuthorized(true)
      } catch (err) {
        console.log('Failed session token validation: ', err)

        const errorMsg = getErrorMessage(err)
        if (errorMsg.includes('client authorization failed')) {
          console.log('Session validation failed, clearing session')
          setTgSessionString('')
          setIsTgAuthorized(false)
        }
      } finally {
        setIsValidating(false)
      }
    }

    validateSession()
  }, [])

  useEffect(() => {
    if (!isTgAuthorized || !tgSessionString) return
    setDialogs([])
    setOffsetParams({ limit: 20 })
    setHasMore(true)
    loadMoreDialogs()
  }, [tgSessionString])

  // Update global user state when Telegram user changes
  useEffect(() => {
    if (user) {
      useGlobal.persist.setOptions({ name: `global-state-${user.id}` })
    }
  }, [user])

  const logout = useCallback(async () => {
    try {
      setIsTgAuthorized(false)
      if (!tgSessionString) return
      await logoutTelegram(tgSessionString)
    } catch (err) {
      const title = 'Failed to log out from Telegram!'
      console.error(title, err)
      setError(getErrorMessage(err), { title })
    }
  }, [tgSessionString, setError])

  const listDialogs = useCallback(
    async (paginationParams = { limit: 10 }) => {
      if (!tgSessionString) return { chats: [], offsetParams: {} }
      try {
        const { chats, offsetParams } = fromResult(
          await listDialogsRequest(tgSessionString, paginationParams)
        )
        return { chats, offsetParams }
      } catch (err) {
        setError(getErrorMessage(err), { title: 'Error fetching dialogs' })
        return { chats: [], offsetParams: {} }
      }
    },
    [tgSessionString]
  )

  const loadMoreDialogs = useCallback(async () => {
    if (!tgSessionString || !hasMore || loadingDialogs) return

    setError(null)
    setLoadingDialogs(true)
    try {
      const { chats, offsetParams: newOffsetParams } =
        await listDialogs(offsetParams)
      setDialogs([...dialogs, ...chats])
      setOffsetParams({ ...newOffsetParams, limit: 100 })
      setHasMore(chats.length > 0)
    } catch (err: any) {
      console.error('Failed to fetch dialogs:', err)
      setError(getErrorMessage(err), { title: 'Failed to load dialogs!' })
    } finally {
      setLoadingDialogs(false)
    }
  }, [tgSessionString, hasMore, loadingDialogs, offsetParams, listDialogs])

  const getMe = useCallback(async () => {
    if (!tgSessionString) return undefined
    try {
      const me = fromResult(await getMeRequest(tgSessionString))
      return me
    } catch (err) {
      setError(getErrorMessage(err), { title: 'Error fetching user info' })
      return undefined
    }
  }, [])

  return (
    <Context.Provider
      value={[
        {
          user,
          launchParams,
          dialogs,
          loadingDialogs,
          isTgAuthorized,
          isValidating,
        },
        { getMe, loadMoreDialogs, logout, setIsTgAuthorized },
      ]}
    >
      {children}
    </Context.Provider>
  )
}

export const useTelegram = (): ContextValue => useContext(Context)
