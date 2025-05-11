'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useBackups } from '@/providers/backup'
import { ChevronRight } from 'lucide-react'
import { Layouts } from '@/components/layouts'

export default function BackupSelectionPage() {
  const { id } = useParams<{ id: string }>()
  const [{ backups }] = useBackups()
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') 

  const dialogBackups = backups.items.filter((b) => b.params.dialogs.includes(id))

  const handleBackupClick = (e: React.MouseEvent, backupCid: string) => {
    e.preventDefault()
    router.push(`/dialog/${id}/backup/${backupCid}?type=${type}`)
  }

  return (
    <Layouts isSinglePage>
  <div className="flex flex-col gap-5 min-h-screen">
    <h1 className="px-5 text-xl font-bold">Select a Backup</h1>
    <div className="flex flex-col">
      {dialogBackups.map((backup, index) => {
        const fromDate = new Date(backup.params.period[0] * 1000).toLocaleDateString()
        const toDate = new Date(backup.params.period[1] * 1000).toLocaleDateString()
        const sharedTime = new Date(backup.params.period[0] * 1000).toLocaleTimeString([])

        return (
          <div
            key={backup.data.toString()}
            className={`flex justify-between items-center px-5 py-3 border-b border-border cursor-pointer hover:bg-muted ${
              index === 0 ? 'rounded-t-lg' : ''
            } ${index === dialogBackups.length - 1 ? 'rounded-b-lg' : ''}`}
            onClick={(e) => handleBackupClick(e, backup.data.toString())}
          >
            <div className="flex flex-col">
              <p className="text-sm text-foreground/60">{`from: ${fromDate}`}</p>
              <p className="text-base font-medium text-foreground">{`to: ${toDate}`}</p>
              <p className="text-sm text-foreground/60">{`at: ${sharedTime}`}</p>
            </div>
            <ChevronRight className="text-muted-foreground" />
          </div>
        );
      })}
    </div>
  </div>
</Layouts>
  )
}