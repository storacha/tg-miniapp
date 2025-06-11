import { Backup, DialogInfo } from '@/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getThumbSrc } from '@/lib/backup/utils'

interface DialogItemProps {
  dialog: DialogInfo
  latestBackup?: Backup
}

export const DialogItem = ({ dialog, latestBackup }: DialogItemProps) => {
  const { name, initials, photo } = dialog
  const thumbSrc = getThumbSrc(photo?.strippedThumb)

  let latestBackupDate
  if (latestBackup) {
    latestBackupDate = new Date(latestBackup.params.period[1] * 1000)
    const isToday =
      latestBackupDate.toDateString() === new Date().toDateString()
    latestBackupDate = isToday
      ? `Today ${latestBackupDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}`
      : latestBackupDate.toLocaleString([], {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
  }

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
