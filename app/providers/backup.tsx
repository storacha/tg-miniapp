import { createContext, useContext, ReactNode, PropsWithChildren, useState, useEffect, useCallback } from 'react'
import { cloudStorage} from '@telegram-apps/sdk-react'
import { Backup, BackupStorage, Job, JobID, JobManager, JobStorage, Period, RestoredBackup } from '@/api'
import { SpaceDID } from '@storacha/ui-react'
import { Client as StorachaClient } from '@storacha/ui-react'
import { TelegramClient } from '@/vendor/telegram'
import { restoreBackup as restoreBackupAction, fetchMoreMessages as fetchMoreMessagesAction} from '@/lib/backup/recoverer'
export interface Result<T> {
  items: T[]
  item?: T
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
  restoredBackup: Result<RestoredBackup>
  // /** Media of the current backup (or current dialog if set). */
  // media: Result<Media>
}

export interface ContextActions {
  addBackupJob: (space: SpaceDID, chats: Set<bigint>, period: Period) => Promise<JobID>
  removeBackupJob: (job: JobID) => Promise<void>
  restoreBackup: ( backupCid: string, dialogId: string, limit: number ) => Promise<void>
  fetchMoreMessages: ( offset: number, limit: number ) => Promise<void>
  // setBackup: (id: Link|null) => void
  // setDialog: (id: bigint | null) => void
}

export type ContextValue = [state: ContextState, actions: ContextActions]

export const ContextDefaultValue: ContextValue = [
  {
    jobs: { items: [], loading: false },
    backups: { items: [], loading: false },
    restoredBackup: { items: [], loading: false}
    // messages: { items: [], loading: false },
    // media: { items: [], loading: false }
  },
  {
    addBackupJob: () => Promise.reject(new Error('provider not setup')),
    removeBackupJob: () => Promise.reject(new Error('provider not setup')),
    restoreBackup: () => Promise.reject(new Error('provider not setup')),
    fetchMoreMessages: () => Promise.reject(new Error('provider not setup'))
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
  
  const [restoredBackup, setRestoredBackup] = useState<RestoredBackup>()
  const [restoredBackupLoading, setRestoredBackupLoading] = useState(false)
  const [restoredBackupError, setRestoredBackupError] = useState<Error>()
  const restoreBackupResult = {
    items: [],
    item: restoredBackup,
    loading: restoredBackupLoading,
    error: restoredBackupError
  }

  const restoreBackup = useCallback(async ( backupCid: string, dialogId: string, limit: number ) => {
    setRestoredBackupLoading(true)
    try {
      setRestoredBackupError(undefined)

      if(!cloudStorage.getKeys.isAvailable){
        throw new Error('Error trying to access cloud storage.')
      }

      const encryptionPassword = await cloudStorage.getItem('encryption-password')
      if (!encryptionPassword) {
        throw new Error('Encryption password not found in cloud storage')
      }

      const result = await restoreBackupAction(backupCid, dialogId, encryptionPassword, limit)
      setRestoredBackup(result)
    } catch (err: any) {
      console.error('Error: restoring backup', err)
      setRestoredBackupError(err)
    }
    finally {
      setRestoredBackupLoading(false)
    }
  }, [])
  
  const fetchMoreMessages = async (offset: number, limit: number) => {
    if (!restoredBackup) {
      console.warn('fetchMoreMessages called without a restored backup')
      return
    }
  
    try {
      if(!cloudStorage.getKeys.isAvailable){
        throw new Error('Error trying to access cloud storage.')
      }

      const encryptionPassword = await cloudStorage.getItem('encryption-password')
      if (!encryptionPassword) {
        throw new Error('Encryption password not found in cloud storage')
      }

      const newMessages = await fetchMoreMessagesAction(restoredBackup.dialogData, encryptionPassword, offset, limit)
      setRestoredBackup((prev) => ({
        ...prev!,
        messages: [...prev!.messages, ...newMessages],
      }))
    } catch (err: any) {
      console.error('Error: fetching more messages', err)
      setRestoredBackupError(err)
    }
  }

  const addBackupJob = (space: SpaceDID, dialogs: Set<bigint>, period: Period) =>
    jobManager.add(space, dialogs, period)

  const removeBackupJob = (id: JobID) => jobManager.remove(id)

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

    ;(async () => {
      setJobsLoading(true)
      try {
        await handleJobChange()
      } finally {
        setJobsLoading(false)
      }
    })()

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

    ;(async () => {
      setBackupsLoading(true)
      try {
        await handleBackupChange()
      } finally {
        setBackupsLoading(false)
      }
    })()

    backupStore.addEventListener('add', handleBackupChange)

    return () => {
      backupStore.removeEventListener('add', handleBackupChange)
    }
  }, [backupStore])

  return (
    <Context.Provider value={[{ jobs: jobsResult, backups: backupsResult, restoredBackup: restoreBackupResult }, { addBackupJob, removeBackupJob, restoreBackup, fetchMoreMessages}]}>
      {children}
    </Context.Provider>
  )
}

export const useBackups = (): ContextValue => useContext(Context)
