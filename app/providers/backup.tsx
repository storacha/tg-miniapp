import { createContext, useContext, ReactNode, PropsWithChildren, useState, useEffect } from 'react'
import { Backup, BackupStorage, Job, JobID, JobManager, JobStorage, Period } from '@/api'
import { SpaceDID } from '@storacha/ui-react'
import { Client as StorachaClient } from '@storacha/ui-react'
import { TelegramClient } from '@/vendor/telegram'

export interface Result<T> {
  items: T[]
  loading: boolean
  error?: Error
}

export interface BackupJobContext {
  telegram: TelegramClient
  storacha: StorachaClient
}

export interface ContextState {
  /** Backups that are in progress. */
  jobs: Result<Job>
  /** Backups that have completed successfully. */
  backups: Result<Backup>
  // /** The current backup item. */
  // backup?: Backup
  // /** The current dialog item. */
  // dialog?: Dialog
  // /** Messages in the current dialog. */
  // messages: Result<Message>
  // /** Media of the current backup (or current dialog if set). */
  // media: Result<Media>
}

export interface ContextActions {
  addBackupJob: (space: SpaceDID, chats: Set<bigint>, period: Period) => Promise<JobID>
  // setBackup: (id: Link|null) => void
  // setDialog: (id: bigint|null) => void
}

export type ContextValue = [state: ContextState, actions: ContextActions]

export const ContextDefaultValue: ContextValue = [
  {
    jobs: { items: [], loading: false },
    backups: { items: [], loading: false },
    // messages: { items: [], loading: false },
    // media: { items: [], loading: false }
  },
  {
    addBackupJob: () => Promise.reject(new Error('provider not setup')),
    // setBackup: () => {},
    // setDialog: () => {}
  },
]

export const Context = createContext<ContextValue>(ContextDefaultValue)

export interface ProviderProps extends PropsWithChildren {
  jobManager: JobManager
  jobs: JobStorage
  backups: BackupStorage
}

/**
 * Provider that enables initiating and tracking current and exiting backups.
 */
export const Provider = ({ jobManager, jobs: jobStore, backups: backupStore, children }: ProviderProps): ReactNode => {
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState<Error>()
  const jobsResult = {
    items: jobs,
    loading: jobsLoading,
    error: jobsError
  }

  const [backups, setBackups] = useState<Backup[]>([])
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [backupsError, setBackupsError] = useState<Error>()
  const backupsResult = {
    items: backups,
    loading: backupsLoading,
    error: backupsError
  }

  const addBackupJob = (space: SpaceDID, dialogs: Set<bigint>, period: Period) =>
    jobManager.add(space, dialogs, period)

  useEffect(() => {
    const handleJobChange = async () => {
      try {
        setJobsError(undefined)
        const jobs = await jobStore.list()
        setJobs(jobs.items)
      } catch (err: any) {
        console.error('Error: handling job change event', err)
        setJobsError(err)
      }
    }
    jobStore.addEventListener('add', handleJobChange)
    jobStore.addEventListener('update', handleJobChange)
    jobStore.addEventListener('remove', handleJobChange)

    return () => {
      jobStore.removeEventListener('add', handleJobChange)
      jobStore.removeEventListener('update', handleJobChange)
      jobStore.removeEventListener('remove', handleJobChange)
    }
  }, [jobStore])

  useEffect(() => {
    const handleBackupChange = async () => {
      try {
        setBackupsError(undefined)
        const backups = await backupStore.list()
        setBackups(backups.items)
      } catch (err: any) {
        console.error('Error: handling backup change event', err)
        setBackupsError(err)
      }
    }
    backupStore.addEventListener('add', handleBackupChange)

    return () => {
      backupStore.removeEventListener('add', handleBackupChange)
    }
  }, [backupStore])

  useEffect(() => {
    (async () => {
      try {
        setJobsLoading(true)
        const jobs = await jobStore.list()
        setJobs(jobs.items)
        console.log(`found ${jobs.items.length} jobs`)
        // any jobs found in this initial load should be restarted
        for await (const j of jobs.items) {
          await jobManager.restart(j.id)
        }
      } catch (err: any) {
        console.error('Error: fetching jobs', err)
        setJobsError(err)
      } finally {
        setJobsLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    (async () => {
      try {
        // await backupStore.clear()
        setBackupsLoading(true)
        const backups = await backupStore.list()
        setBackups(backups.items)
        console.log(`found ${backups.items.length} backups`)
      } catch (err: any) {
        console.error('Error: fetching backups', err)
        setBackupsError(err)
      } finally {
        setBackupsLoading(false)
      }
    })()
  }, [])

  return (
    <Context.Provider value={[{ jobs: jobsResult, backups: backupsResult }, { addBackupJob }]}>
      {children}
    </Context.Provider>
  )
}

export const useBackups = (): ContextValue => useContext(Context)
