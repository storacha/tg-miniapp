import { useCallback } from 'react'
import { useError } from '@/providers/error'
import { useGlobal } from '@/zustand/global'
import { useTelegram } from '@/providers/telegram'
import { getErrorMessage } from '@/lib/errorhandling'
import { useW3 as useStoracha } from '@storacha/ui-react'

export const useLogout = (): (() => Promise<void>) => {
  const [, { logout: storachaLogout }] = useStoracha()
  const [, { logout: telegramLogout }] = useTelegram()
  const { clearAuthState } = useGlobal()
  const { setError } = useError()

  return useCallback(async () => {
    await telegramLogout()

    try {
      await storachaLogout()
    } catch (err) {
      setError(getErrorMessage(err), {
        title: 'Failed to log out from Storacha!',
      })
    }
    // Clear all auth-related state
    clearAuthState()
    sessionStorage.clear()
    localStorage.removeItem('GramJs:apiCache')
  }, [storachaLogout, telegramLogout, clearAuthState, setError])
}
