import { useGlobal } from '@/zustand/global'
import { useState, useEffect } from 'react'

// Try to fetch the high quality photo for the given entity.
// If it works, the image will be cached and can be passed to an image src url.
export function useProfilePhoto(
  entityId?: string,
  accessHash?: string
): string | undefined {
  const [hqUrl, setHqUrl] = useState<string>()
  const { tgSessionString } = useGlobal()
  useEffect(
    function () {
      if (!entityId) return
      console.log('loading HQ for id ', entityId)
      ;(async function () {
        // session is required for this to work unless it's been cached
        // but we keep it in a query param rather than the URL so that browsers with support for
        // No-Vary-Search ignore it when considering whether to cache the image.
        const query: { access?: string; session: string } = {
          session: tgSessionString,
        }
        if (accessHash) query.access = accessHash
        const queryString = new URLSearchParams(query).toString()
        const url = `/api/entity/${encodeURIComponent(entityId)}/image${queryString ? `?${queryString}` : ''}`
        const result = await fetch(url)
        if (result.status === 200) {
          setHqUrl(url)
        }
      })()
    },
    [entityId, accessHash, tgSessionString]
  )
  return hqUrl
}
