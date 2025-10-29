import { useQuery } from '@tanstack/react-query'
import { Ranking } from '@/api'
import { useGlobal } from '@/zustand/global'
import { useBackups } from '@/providers/backup'
import { logAndAddContext } from '@/lib/sentry'

export function useRanking() {
  const { tgSessionString, space } = useGlobal()
  const [{ backups }] = useBackups()

  return useQuery({
    queryKey: ['ranking', backups.items.length], // Refetch when backups change
    queryFn: async (): Promise<Ranking> => {
      logAndAddContext('Fetching ranking...', {
        level: 'info',
        data: { space, hasSession: !!tgSessionString },
      })

      const response = await fetch('/api/ranking')

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized')
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response.json()
    },
    retry: (failureCount, error) => {
      if (error.message === 'Unauthorized') return false
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30000, // Cache for 30 seconds
    enabled: !!(tgSessionString && space), // Only run when authenticated and space exists
  })
}
