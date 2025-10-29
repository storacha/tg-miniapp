import { useQuery } from '@tanstack/react-query'
import { useGlobal } from '@/zustand/global'

interface SessionValidationResponse {
  userId: string
}

export function useSessionValidation() {
  const { tgSessionString } = useGlobal()

  return useQuery({
    queryKey: ['session-validation'],
    queryFn: async (): Promise<SessionValidationResponse> => {
      const response = await fetch('/api/me')

      if (!response.ok) {
        const errorData = await response.json()
        console.log('Session validation failed with:', errorData)

        if (response.status === 401) {
          throw new Error('Unauthorized')
        } else {
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }
      }

      const result = await response.json()
      console.log('Session is valid, user is authorized')
      return result
    },
    retry: (failureCount, error) => {
      // Don't retry unauthorized errors
      if (error.message === 'Unauthorized') return false
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // Consider session valid for 5 minutes
    enabled: !!tgSessionString, // Only run when we have a session string
    refetchOnWindowFocus: true, // Revalidate when window regains focus
    refetchOnReconnect: true, // Revalidate on network reconnect
  })
}
