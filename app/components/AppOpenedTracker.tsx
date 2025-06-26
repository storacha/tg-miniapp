'use client'

import { useAnalytics } from '@/lib/analytics'
import { useGlobal } from '@/zustand/global'
import { useEffect } from 'react'

export function AppOpenedTracker() {
  const { isStorachaAuthorized, isTgAuthorized } = useGlobal()
  const { logAppOpened } = useAnalytics()
  useEffect(function () {
    logAppOpened({
      storachaAuthed: isStorachaAuthorized,
      telegramAuthed: isTgAuthorized,
    })
  }, [])
  return <></>
}
