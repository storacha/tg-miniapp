import { SpaceDID, useW3 as useStoracha } from '@storacha/ui-react'
import { DialogsById, Period } from '@/api'
import { Button } from '../ui/button'
import { FormEventHandler } from 'react'
import { useBackups } from '@/providers/backup'
import { useGlobal } from '@/zustand/global'
import { formatBytes } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { getStorachaUsage } from '@/lib/storacha'

export interface SummaryProps {
  chats: DialogsById
  space: SpaceDID
  period: Period
  starting: boolean
  onSubmit: () => unknown
}

export const Summary = ({
  chats,
  period,
  starting,
  onSubmit,
}: SummaryProps) => {
  const [storageUsed, setStorageUsed] = useState<number>()
  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault()
    onSubmit()
  }
  const [{ jobsReady }, {}] = useBackups()
  const [{ client }] = useStoracha()
  const { space } = useGlobal()
  const chatsLength = Object.keys(chats).length

  useEffect(() => {
    const fetchStorageUsage = async () => {
      if (!space || !client) return

      try {
        const usage = await getStorachaUsage(client, space)
        setStorageUsed(usage)
      } catch (err) {
        console.error('Failed to fetch storage usage', err)
      }
    }

    fetchStorageUsage()
  }, [space, client])

  return (
    <form onSubmit={handleSubmit}>
      <div className="w-full pt-0 px-5 flex flex-col text-center justify-center gap-2 pb-5">
        <h1 className="text-lg font-semibold text-foreground text-center">
          Ready?
        </h1>
        <p className="text-sm">Check the details before we start.</p>
        {typeof storageUsed === 'number' && (
          <p className="text-center text-sm text-muted-foreground">
            Total storage usage: {formatBytes(storageUsed)}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-5 rounded-t-xl bg-background w-full flex-grow py-2">
        <div className="flex space-x-2 items-center gap-2 border-b border-primary/10 p-5">
          <p>
            {chatsLength.toLocaleString()} Chat{chatsLength === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex space-x-2 items-center gap-2 border-b border-primary/10 p-5">
          {period[0] === 0 && period[1] == null ? (
            <p>Period: All time</p>
          ) : (
            <>
              <p>From: {new Date(period[0] * 1000).toLocaleDateString()}</p>
              <p>
                To:{' '}
                {new Date(
                  period[1] ? period[1] * 1000 : Date.now()
                ).toLocaleDateString()}
              </p>
            </>
          )}
        </div>
        <div className="sticky bottom-0 w-full p-5">
          <Button
            type="submit"
            className="w-full"
            disabled={starting || !jobsReady}
          >
            {starting ? 'Starting...' : 'Start Backup'}
          </Button>
        </div>
      </div>
    </form>
  )
}
