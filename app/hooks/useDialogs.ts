import { useInfiniteQuery } from '@tanstack/react-query'
import { DialogInfo } from '@/api'
import { useTelegram } from '@/providers/telegram'
import { useGlobal } from '@/zustand/global'

interface DialogsResponse {
  chats: DialogInfo[]
  offsetParams: {
    offsetId: number
    offsetDate: number
    offsetPeer: string
  }
}

interface DialogsPaginationParams {
  offsetId: number
  offsetDate: number
  offsetPeer: string
}

export function useDialogs() {
  const [{ isTgAuthorized }] = useTelegram()
  const { tgSessionString } = useGlobal()

  return useInfiniteQuery({
    queryKey: ['dialogs'],
    queryFn: async ({ pageParam }: { pageParam?: DialogsPaginationParams }) => {
      const searchParams = new URLSearchParams({
        limit: '20',
      })

      // Only add pagination params if they exist and are valid
      if (pageParam) {
        if (pageParam.offsetId && pageParam.offsetId > 0) {
          searchParams.append('offsetId', pageParam.offsetId.toString())
        }
        if (pageParam.offsetDate && pageParam.offsetDate > 0) {
          searchParams.append('offsetDate', pageParam.offsetDate.toString())
        }
        if (pageParam.offsetPeer) {
          searchParams.append('offsetPeer', pageParam.offsetPeer)
        }
      }

      console.log(
        'Fetching dialogs with params:',
        Object.fromEntries(searchParams.entries())
      )

      const response = await fetch(`/api/dialogs?${searchParams}`)

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized')
        }
        const errorText = await response.text()
        console.error('Dialogs API error:', errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = (await response.json()) as DialogsResponse

      // Convert strippedThumb back to Uint8Array after JSON deserialization
      // JSON serialization converts Uint8Array to plain objects with numeric indices
      if (result.chats) {
        result.chats.forEach((chat) => {
          if (chat.photo?.strippedThumb) {
            // Convert plain object back to Uint8Array
            chat.photo.strippedThumb = new Uint8Array(
              Object.values(chat.photo.strippedThumb)
            )
          }
        })
      }

      return result
    },
    getNextPageParam: (lastPage: DialogsResponse) => {
      // Only continue if we have chats and valid offset params
      if (!lastPage?.chats || lastPage.chats.length === 0) {
        console.log('No more dialogs to fetch - empty page')
        return undefined
      }

      // If we got fewer chats than requested, we're at the end
      if (lastPage.chats.length < 20) {
        console.log('No more dialogs to fetch - got fewer than 20 chats')
        return undefined
      }

      // Ensure we have valid pagination parameters
      const { offsetParams } = lastPage
      if (!offsetParams || !offsetParams.offsetId || !offsetParams.offsetDate) {
        console.log('Invalid offset parameters, stopping pagination')
        return undefined
      }

      console.log('Next page params:', offsetParams)
      return offsetParams
    },
    initialPageParam: undefined,
    retry: (failureCount, error) => {
      if (error.message === 'Unauthorized') return false
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 60000, // Cache for 1 minute
    enabled: !!(tgSessionString && isTgAuthorized), // Only run when authenticated
  })
}
