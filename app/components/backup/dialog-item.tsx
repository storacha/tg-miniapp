import { AbsolutePeriod, DialogInfo } from '@/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUserLocale } from '@/hooks/useUserLocale'
import { getThumbSrc } from '@/lib/backup/utils'
import { useGlobal } from '@/zustand/global'
import { useEffect, useState } from 'react'

interface DialogItemProps {
  dialog: DialogInfo
  latestBackup?: AbsolutePeriod
}

// Try to fetch the high quality photo for the given entity.
// If it works, the image will be cached and can be passed to an image src url.
function useHighQualityProfilePhoto(
  entityId?: string,
  accessHash?: string
): string | undefined {
  const [hqUrl, setHqUrl] = useState<string>()
  const { tgSessionString } = useGlobal()
  useEffect(
    function () {
      console.log('loading HQ for id ', entityId)
      if (entityId) {
        ;(async function () {
          // session is required for this to work unless it's been cached
          // but we keep it in a query param so that browsers with support for
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
      }
    },
    [entityId, accessHash, tgSessionString]
  )
  return hqUrl
}

export const DialogItem = ({ dialog, latestBackup }: DialogItemProps) => {
  const { name, initials, photo, dialogId, accessHash } = dialog
  const lqThumbSrc = getThumbSrc(photo?.strippedThumb)
  const hqThumbSrc = useHighQualityProfilePhoto(dialogId, accessHash)

  const { formatDateTime } = useUserLocale()
  const latestBackupDate = latestBackup
    ? formatDateTime(Number(latestBackup[1]))
    : undefined

  return (
    <div className="flex gap-4 items-center w-full">
      <Avatar className="flex-none">
        <AvatarImage src={hqThumbSrc || lqThumbSrc} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-auto">
        <h1 className="font-semibold text-foreground/80">{name}</h1>
        <p className="text-sm text-foreground/60">
          Last Backup:{' '}
          {latestBackupDate ?? <span className="text-red-900">Never</span>}
        </p>
      </div>
    </div>
  )
}
