import { useTelegram } from '@/providers/telegram'
import { useEffect, useState } from 'react'

export const useUserLocale = () => {
  const [userLocale, setUserLocale] = useState<string>('en-US')
  const [{ user }] = useTelegram()

  useEffect(() => {
    const tgLocale = user?.languageCode
    const browserLocale =
      typeof window !== 'undefined'
        ? navigator.language || navigator.languages?.[0]
        : undefined
    // Prioritize mini app browser locale, since languageCode only contains the language information, not the region
    setUserLocale(browserLocale || tgLocale || 'en-US')
  }, [user])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(userLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString(userLocale, {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()

    if (isToday) {
      return `Today ${formatTime(timestamp)}`
    } else {
      return `${formatDate(timestamp)} ${formatTime(timestamp)}`
    }
  }

  return {
    formatDate,
    formatTime,
    formatDateTime,
  }
}
