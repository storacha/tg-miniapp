import { AbsolutePeriod, DialogInfo } from '@/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUserLocale } from '@/hooks/useUserLocale'
import { getThumbSrc } from '@/lib/backup/utils'

interface DialogItemProps {
  dialog: DialogInfo
  latestBackup?: AbsolutePeriod
}

export const DialogItem = ({ dialog, latestBackup }: DialogItemProps) => {
  const { name, initials, photo } = dialog
  const thumbSrc = getThumbSrc(photo?.strippedThumb)
  const { formatDateTime } = useUserLocale()
  const latestBackupDate = latestBackup
    ? formatDateTime(Number(latestBackup[1]))
    : undefined

  return (
    <div className="flex gap-4 items-center w-full">
      <Avatar className="flex-none">
        <AvatarImage src={thumbSrc} />
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
