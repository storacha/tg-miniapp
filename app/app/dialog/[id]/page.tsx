'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useBackups } from '@/providers/backup'
import { ChevronRight, Trash2, Loader2 } from 'lucide-react'
import { Layouts } from '@/components/layouts'
import { useMemo, useState } from 'react'
import { useUserLocale } from '@/hooks/useUserLocale'
import { getNormalizedEntityId } from '@/lib/backup/utils'
import { EntityType } from '@/api'
import { logAndAddContext } from '@/lib/sentry'
import { useSentryContext } from '@/hooks/useSentryContext'

export default function BackupSelectionPage() {
  const { captureError } = useSentryContext()
  const { id } = useParams<{ id: string }>()
  const [{ backups }, { restoreBackup, deleteBackup }] = useBackups()
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type')
  const { formatDate, formatTime } = useUserLocale()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<{
    id: string
    cid: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const dialogBackups = useMemo(
    () =>
      backups.items
        .filter((b) => b.params.dialogs[id])
        .sort((a, b) => b.params.period[1] - a.params.period[1]),
    [backups.items, id]
  )

  const handleBackupClick = (e: React.MouseEvent, backupCid: string) => {
    e.preventDefault()
    const normalizedId = getNormalizedEntityId(id, type as EntityType)
    restoreBackup(backupCid, normalizedId, 20)
    router.push(`/dialog/${id}/backup/${backupCid}?type=${type}`)
  }

  const triggerDelete = (
    e: React.MouseEvent,
    backupId: string,
    backupCid: string
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedBackup({ id: backupId, cid: backupCid })
    setConfirmDelete(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedBackup) return
    setIsDeleting(true)
    try {
      logAndAddContext('Backup deletion requested', {
        category: 'ui.dialog',
        level: 'info',
        data: {
          id,
          backupId: selectedBackup.id,
          backupCid: selectedBackup.cid,
        },
      })
      const onlyOne = dialogBackups.length === 1
      await deleteBackup(selectedBackup.id, id)
      console.log(`deletion completed`)
      if (onlyOne) {
        router.push('/')
      }
    } catch (error) {
      captureError(error, {
        tags: {
          page: 'dialog',
          action: 'delete',
        },
        extra: {
          id,
          backupId: selectedBackup.id,
          backupCid: selectedBackup.cid,
        },
      })
    } finally {
      setIsDeleting(false)
      setConfirmDelete(false)
      setSelectedBackup(null)
    }
  }

  return (
    <Layouts isSinglePage>
      <div className="flex flex-col gap-5 min-h-screen">
        <h1 className="px-5 text-xl font-bold">Select a Backup</h1>
        <div className="flex flex-col">
          {dialogBackups.map((backup, index) => {
            const fromDate =
              backup.params.period[0] === 0
                ? 'all time'
                : formatDate(backup.params.period[0])
            const toDate = formatDate(backup.params.period[1])
            const sharedTime = formatTime(backup.params.period[1])

            return (
              <div
                key={backup.data.toString()}
                className={`flex justify-between items-center px-5 py-3 border-b border-border cursor-pointer hover:bg-muted ${
                  index === 0 ? 'rounded-t-lg' : ''
                } ${index === dialogBackups.length - 1 ? 'rounded-b-lg' : ''}`}
                onClick={(e) => handleBackupClick(e, backup.data)}
              >
                <div className="flex flex-col">
                  <p className="text-sm text-foreground/60">{`from: ${fromDate}`}</p>
                  <p className="text-base font-medium text-foreground">{`to: ${toDate}`}</p>
                  <p className="text-sm text-foreground/60">{`at: ${sharedTime}`}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Trash2
                    className="text-red-500 hover:text-red-700"
                    onClick={(e) => triggerDelete(e, backup.id, backup.data)}
                  />
                  <ChevronRight className="text-muted-foreground" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold mb-2">Delete Backup?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              This action is irreversible. <br />
              <br /> Are you sure you want to delete this backup from Storacha?
              They may still remain available on the network for some amount of
              time.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                onClick={() => {
                  setConfirmDelete(false)
                  setSelectedBackup(null)
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 flex items-center justify-center"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layouts>
  )
}
