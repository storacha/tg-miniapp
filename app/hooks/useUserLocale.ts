import { useTelegram } from '@/providers/telegram'
import { useEffect, useState } from 'react'

export const useUserLocale = () => {
  const [userLocale, setUserLocale] = useState<string>()
  const [{ user }] = useTelegram()

  useEffect(() => {
    try {
      const tgLocale = user?.languageCode
      const browserLocale = navigator.language || navigator.languages?.[0]
      setUserLocale(browserLocale || tgLocale || 'en-US')
    } catch (error) {
      console.warn(
        'Failed to get Telegram locale, using browser locale:',
        error
      )
      const browserLocale = navigator.language || navigator.languages?.[0]
      setUserLocale(browserLocale || 'en-US')
    }
  }, [])

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
