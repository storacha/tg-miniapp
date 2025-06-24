import { useEffect, useState } from 'react'
import WebApp from '@twa-dev/sdk'

export const useUserLocale = () => {
  const [userLocale, setUserLocale] = useState<string>()

  useEffect(() => {
    try {
      // @telegram-apps/sdk-react doesn't provide access to the language code property
      // hence the usage of @twa-dev/sdk here
      const tgLocale = WebApp.initDataUnsafe?.user?.language_code
      const browserLocale = navigator.language || navigator.languages?.[0]
      setUserLocale(tgLocale || browserLocale || 'en-US')
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
