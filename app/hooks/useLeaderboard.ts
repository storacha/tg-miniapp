import { useQuery } from '@tanstack/react-query'
import { LeaderboardUser, Ranking } from '@/api'

interface LeaderboardResponse {
  leaderboard: LeaderboardUser[]
  ranking?: Ranking
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async (): Promise<LeaderboardResponse> => {
      const response = await fetch('/api/leaderboard')

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
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes (leaderboard doesn't change as frequently)
  })
}
