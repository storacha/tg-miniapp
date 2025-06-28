'use client'

import { useAnalytics } from '@/lib/analytics'
import { useTelegram } from '@/providers/telegram'
import { useGlobal } from '@/zustand/global'
import { useEffect } from 'react'

export function AppOpenedTracker() {
  const { isStorachaAuthorized } = useGlobal()
  const [{ isTgAuthorized }] = useTelegram()
  const { logAppOpened } = useAnalytics()
  useEffect(function () {
    logAppOpened({
      storachaAuthed: isStorachaAuthorized,
      telegramAuthed: isTgAuthorized,
    })
  }, [])
  return <></>
}
