'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useBackups } from '@/providers/backup'
import { ChevronRight } from 'lucide-react'
import { Layouts } from '@/components/layouts'

export const runtime = 'edge'

export default function BackupSelectionPage() {
  const { id } = useParams<{ id: string }>()
  const [{ backups }] = useBackups()
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') 

  const dialogBackups = backups.items.filter((b) => b.dialogs.has(BigInt(id)))

  const handleBackupClick = (e: React.MouseEvent, backupCid: string) => {
    e.preventDefault()
    router.push(`/dialog/${id}/backup/${backupCid}?type=${type}`)
  }

  return (
    <Layouts isSinglePage>
        <div className="flex flex-col gap-5 min-h-screen">
        <h1 className="px-5">Select a Backup</h1>
        <div className="flex flex-col">
            {dialogBackups.map((backup) => (
            <div
                key={backup.data.toString()}
                className="flex justify-between items-center px-5 py-3 border-b border-border cursor-pointer hover:bg-muted"
                onClick={(e) => handleBackupClick(e, backup.data.toString())}
            >
                <div>
                <p className="text-sm text-foreground/60">Backup Date:</p>
                <p className="text-lg font-semibold text-foreground">
                    {new Date(backup.period[1] * 1000).toLocaleString()}
                </p>
                </div>
                <ChevronRight />
            </div>
            ))}
        </div>
        </div>
    </Layouts>
  )
}