import { useSearchParams } from 'next/navigation'
import { usePlausible } from 'next-plausible'
import { useEffect, useMemo } from 'react'
import useLocalStorageState from 'use-local-storage-state'

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
  'login-started': TrackingParams & {}
  'login-success': TrackingParams & {}
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

export const useAnalytics = () => {
  const track = useTrack()
  const searchParams = useSearchParams()

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

      logLoginStarted: (props: AnalyticsEvents['login-started'] = {}) => {
        track('login-started', {
          props: { ...utmParams, ...props },
        })
      },

      logLoginSuccess: (props: AnalyticsEvents['login-success'] = {}) => {
        track('login-success', {
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
