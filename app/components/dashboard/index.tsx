import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { JobID, PendingJob } from '@/api'
import { useGlobal } from '@/zustand/global'
import { useBackups } from '@/providers/backup'
import Head from '@/components/dashboard/head'
import { Button } from '@/components/ui/button'
import { StorachaConnect } from '@/components/backup/connect'
import BackedChats from '@/components/dashboard/backed-chats'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const router = useRouter()
  const [{ jobs }, { removeBackupJob, cancelBackupJob }] = useBackups()
  const { isStorachaAuthorized, isFirstLogin } = useGlobal()

  return (
    <div className="w-full flex items-center flex-col h-full">
      <div className="w-full px-5 mb-5">
        <Head />
      </div>
      {jobs.items.map((j) => (
        <JobItem
          key={j.id}
          job={j}
          onRemove={removeBackupJob}
          onCancel={cancelBackupJob}
        />
      ))}
      <div className="rounded-t-xl bg-background flex-grow w-full shadow-t-xl pt-5">
        <BackedChats />
      </div>
      <div className="sticky bottom-0 bg-white w-full px-5 pb-5">
        {isStorachaAuthorized || isFirstLogin ? (
          <Button className="w-full" onClick={() => router.push('/backup')}>
            Start New Backup
          </Button>
        ) : (
          <StorachaConnect open={!isStorachaAuthorized} />
        )}
      </div>
    </div>
  )
}

const JobItem = ({
  job,
  onRemove,
  onCancel,
}: {
  job: PendingJob
  onRemove: (id: JobID) => unknown
  onCancel: (id: JobID) => unknown
}) => {
  const progress =
    job.status === 'running' || job.status === 'failed' ? job.progress : 0

  console.log('job progress', progress)

  const STUCK_JOB_TIMEOUT_MS = 3 * 60 * 60 * 1000
  const isStuck =
    (job.status === 'running' || job.status === 'waiting') &&
    Date.now() - job.updated > STUCK_JOB_TIMEOUT_MS

  const DialogsLength = Object.keys(job.params.dialogs).length

  return (
    <div className="w-full px-5 mb-5">
      <div className="w-full bg-background rounded-sm border">
        <div className="flex justify-between items-center px-5 pt-3">
          <p>
            Backup <span className="capitalize">{job.status}</span>
          </p>
          {job.status === 'failed' && (
            <button onClick={() => onRemove(job.id)}>
              <X />
            </button>
          )}
          {isStuck && (
            <button onClick={() => onCancel(job.id)}>
              <X />
            </button>
          )}
        </div>
        {job.status === 'failed' && job.cause && (
          <p className="px-5 pt-1 text-red-900 text-xs">Error: {job.cause}</p>
        )}
        <div className="flex justify-between items-center px-3 py-3">
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div
              className="bg-blue-900 h-2.5 rounded-full transition-all"
              style={{ width: `${progress * 100}%` }}
            ></div>
          </div>
        </div>
        <div className="flex justify-between items-center px-3 pb-4">
          <span className="text-muted-foreground text-xs">
            {Math.floor(progress * 100)}% Completed
          </span>
          <span className="text-muted-foreground text-xs">
            {DialogsLength} Chat{DialogsLength > 1 ? 's' : ''} Backing Up
          </span>
        </div>
      </div>
    </div>
  )
}
