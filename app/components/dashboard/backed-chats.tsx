import { useRouter } from 'next/navigation'
import { ShieldCheck, ChevronRight } from 'lucide-react'
import { useBackups } from '@/providers/backup'
import { DialogItem } from '@/components/backup/dialog-item'
import { AbsolutePeriod, DialogInfo } from '@/api'
import { Loading } from '../ui/loading'

export default function BackedChats() {
  const router = useRouter()
  const [{ backups }] = useBackups()

  const sortedBackups = backups.items.sort(
    (a, b) => b.params.period[1] - a.params.period[1]
  )

  const dialogIdMap: Record<
    string,
    { dialogInfo: DialogInfo; latestBackup: AbsolutePeriod }
  > = {}

  for (const backup of sortedBackups) {
    for (const [dialogId, dialogInfo] of Object.entries(
      backup.params.dialogs
    )) {
      if (!dialogIdMap[dialogId]) {
        dialogIdMap[dialogId] = {
          dialogInfo: { id: dialogId, ...dialogInfo },
          latestBackup: backup.params.period,
        }
      }
    }
  }

  const handleDialogItemClick =
    (dialogId: string, dialogType?: string) => (e: React.MouseEvent) => {
      e.preventDefault()
      router.push(
        `/dialog/${dialogId}${dialogType ? `?type=${dialogType}` : ''}`
      )
    }

  return (
    <div className="flex flex-col gap-5 min-h-screen">
      <h1 className="px-5">Chats</h1>
      {backups.loading && (
        <div className="text-center">
          <Loading text={'Loading chats...'} />
        </div>
      )}
      {backups.items.length === 0 ? (
        <div className="flex flex-col justify-center items-center px-10 pt-20 gap-2">
          <div className="text-foreground/40 p-2">
            <ShieldCheck size={30} />
          </div>
          <p className="text-lg font-semibold text-foreground/40">
            Storacha is Safe
          </p>
          <p className="text-center text-sm text-foreground/40">
            Secure your data today with our encrypted storage.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {Object.values(dialogIdMap).map(({ dialogInfo, latestBackup }) => (
            <div
              key={dialogInfo.id}
              className="flex justify-start gap-10 items-center active:bg-accent px-5 py-3"
              data-id={dialogInfo.id}
              onClick={handleDialogItemClick(dialogInfo.id, dialogInfo.type)}
            >
              <DialogItem dialog={dialogInfo} latestBackup={latestBackup} />
              <div className="flex-none">
                <ChevronRight />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
