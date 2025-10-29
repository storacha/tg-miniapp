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
import { useQueryClient } from '@tanstack/react-query'
import { logout as logoutTelegram } from '../components/server'
import { useGlobal } from '@/zustand/global'
import { getErrorMessage } from '@/lib/errorhandling'
import { useError } from './error'
import { useRouter } from 'next/navigation'
import { useSessionValidation } from '@/hooks/useSessionValidation'

export interface ContextState {
  launchParams: LaunchParams
  user?: User
  isTgAuthorized: boolean
  isValidating: boolean
}

export interface ContextActions {
  logout: () => Promise<void>
  setIsTgAuthorized: (isTgAuthorized: boolean) => void
}

export type ContextValue = [state: ContextState, actions: ContextActions]

export const ContextDefaultValue: ContextValue = [
  {
    launchParams: { platform: '', themeParams: {}, version: '' },
    user: undefined,
    isTgAuthorized: false,
    isValidating: true,
  },
  {
    logout: () => Promise.reject(new Error('provider not setup')),
    setIsTgAuthorized: () => {
      throw new Error('provider not setup')
    },
  },
]

export const Context = createContext<ContextValue>(ContextDefaultValue)

/**
 * Provider that adds launch params, init data and handles Telegram authentication.
 */
export const Provider = ({ children }: PropsWithChildren): ReactNode => {
  const { tgSessionString, setTgSessionString } = useGlobal()
  const [isTgAuthorized, setIsTgAuthorized] = useState(false)
  const { setError } = useError()
  const router = useRouter()
  const queryClient = useQueryClient()

  const user = useSignal(initData.user)
  const launchParams = useLaunchParams()

  const {
    data: sessionData,
    isLoading: isValidating,
    error: sessionError,
    isSuccess: isSessionValid,
  } = useSessionValidation()

  // Handle session validation results
  useEffect(() => {
    if (isSessionValid && sessionData) {
      console.log('Session is valid, user is authorized')
      setIsTgAuthorized(true)
    } else if (sessionError) {
      console.log('Failed session token validation:', sessionError)
      const errorMsg = getErrorMessage(sessionError)

      if (errorMsg.includes('Unauthorized')) {
        console.log('Session validation failed, clearing session')
        setTgSessionString('')
        setIsTgAuthorized(false)
      }
    } else if (!tgSessionString) {
      // No session string, user is not authorized
      setIsTgAuthorized(false)
    }
  }, [
    isSessionValid,
    sessionData,
    sessionError,
    tgSessionString,
    setTgSessionString,
  ])

  const logout = useCallback(async () => {
    try {
      setIsTgAuthorized(false)

      // Clear all React Query cache
      queryClient.clear()

      if (!tgSessionString) return
      await logoutTelegram(tgSessionString)
      // we clear the TG session string once we are successfully logged out
      setTgSessionString('')
      // redirect to home page after logout
      router.push('/')
    } catch (err) {
      const title = 'Failed to log out from Telegram!'
      console.error(title, err)
      setError(err, { title })
    }
  }, [tgSessionString, setError, queryClient])

  return (
    <Context.Provider
      value={[
        {
          user,
          launchParams,
          isTgAuthorized,
          isValidating,
        },
        { logout, setIsTgAuthorized },
      ]}
    >
      {children}
    </Context.Provider>
  )
}

export const useTelegram = (): ContextValue => useContext(Context)
