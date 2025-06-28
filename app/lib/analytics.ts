import { usePlausible } from 'next-plausible'
import { useEffect, useMemo } from 'react'
import useLocalStorageState from 'use-local-storage-state'
import { useTelegram } from '@/providers/telegram'
import { base64url } from 'multiformats/bases/base64'

export type TrackingParams = {
  source?: string
  utm_term?: string
  utm_content?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

export type AnalyticsEvents = {
  'app-opened': TrackingParams & {
    telegramAuthed: boolean
    storachaAuthed: boolean
  }
  'telegram-login-started': TrackingParams & {}
  'telegram-login-success': TrackingParams & {}
  'storacha-login-started': TrackingParams & {}
  'storacha-login-success': TrackingParams & {}
  'humanode-started': TrackingParams & {}
  'humanode-success': TrackingParams & {}
  'backup-opened': TrackingParams & {}
  'backup-requested': TrackingParams & {}
  'backup-success': TrackingParams & {}
}

export const useTrack = () => usePlausible<AnalyticsEvents>()

const utms = [
  'utm_source',
  'utm_medium',
  'utm_content',
  'utm_term',
  'utm_content',
]

/**
 * Parse a "start parameter" that we assume is a base64url encoded
 * query string. We expect our marketing team to create URLs like
 * https://t.me/storacha_bot/backup?startapp=dXRtX3NvdXJjZT10aGVtaW5kJnV0bV9tZWRpdW09dGVsZXBhdGh5
 * since dXRtX3NvdXJjZT10aGVtaW5kJnV0bV9tZWRpdW09dGVsZXBhdGh5 is
 * the base64url encoding of "utm_source=themind&utm_medium=telepathy"
 */
function parseStartParam(params: string | undefined): URLSearchParams {
  if (!params) return new URLSearchParams()
  return new URLSearchParams(
    new TextDecoder().decode(base64url.baseDecode(params))
  )
}

export const useAnalytics = () => {
  const track = useTrack()
  const [{ launchParams }] = useTelegram()
  const searchParams = parseStartParam(launchParams.startParam)
  /**
   * useLocalStorage and useEffect here combine to give us something
   * similar to useMemo except:
   * a) the value is kept in local storage
   * b) we only update the value when searchParams has utm_* parameters
   */
  const [utmParams, setUtmParams] = useLocalStorageState<
    Record<string, string>
  >('utms', { defaultValue: {} })
  useEffect(() => {
    const utmps = utms.reduce(
      (m, utm) => {
        const value = searchParams.get(utm)
        if (value) {
          m[utm] = value
        }
        return m
      },
      {} as Record<string, string>
    )
    if (Object.keys(utmps).length > 0) {
      setUtmParams(utmps)
    }
  }, [searchParams, setUtmParams])

  return useMemo(
    () => ({
      logAppOpened: (props: AnalyticsEvents['app-opened']) => {
        track('app-opened', {
          props: { ...utmParams, ...props },
        })
      },

      logTelegramLoginStarted: (
        props: AnalyticsEvents['telegram-login-started'] = {}
      ) => {
        track('telegram-login-started', {
          props: { ...utmParams, ...props },
        })
      },

      logTelegramLoginSuccess: (
        props: AnalyticsEvents['telegram-login-success'] = {}
      ) => {
        track('telegram-login-success', {
          props: { ...utmParams, ...props },
        })
      },

      logStorachaLoginStarted: (
        props: AnalyticsEvents['storacha-login-started'] = {}
      ) => {
        track('storacha-login-started', {
          props: { ...utmParams, ...props },
        })
      },

      logStorachaLoginSuccess: (
        props: AnalyticsEvents['storacha-login-success'] = {}
      ) => {
        track('storacha-login-success', {
          props: { ...utmParams, ...props },
        })
      },

      logHumanodeStarted: (props: AnalyticsEvents['humanode-started'] = {}) => {
        track('humanode-started', {
          props: { ...utmParams, ...props },
        })
      },

      logHumanodeSuccess: (props: AnalyticsEvents['humanode-success'] = {}) => {
        track('humanode-success', {
          props: { ...utmParams, ...props },
        })
      },

      logBackupOpened: (props: AnalyticsEvents['backup-opened'] = {}) => {
        track('backup-opened', {
          props: { ...utmParams, ...props },
        })
      },

      logBackupRequested: (props: AnalyticsEvents['backup-requested'] = {}) => {
        track('backup-requested', {
          props: { ...utmParams, ...props },
        })
      },

      logBackupSuccess: (props: AnalyticsEvents['backup-success'] = {}) => {
        track('backup-success', {
          props: { ...utmParams, ...props },
        })
      },
    }),
    [track, utmParams]
  )
}
