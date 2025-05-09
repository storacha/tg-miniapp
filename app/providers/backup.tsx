import { createContext, useContext, ReactNode, PropsWithChildren, useState, useEffect, useCallback } from 'react'
import { cloudStorage} from '@telegram-apps/sdk-react'
import { Backup, JobID, JobManager, JobStorage, PendingJob, Period, RestoredBackup } from '@/api'
import { SpaceDID } from '@storacha/ui-react'
import { Client as StorachaClient } from '@storacha/ui-react'
import { TelegramClient } from '@/vendor/telegram'
import { restoreBackup as restoreBackupAction, fetchMoreMessages as fetchMoreMessagesAction} from '@/lib/backup/recoverer'
import { create as createCipher } from '@/lib/aes-cbc-cipher'

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
  jobs: Result<PendingJob>
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
  jobManager?: JobManager
  jobs?: JobStorage
}

/**
 * Provider that enables initiating and tracking current and exiting backups.
 */
export const Provider = ({ jobManager, jobs: jobStore, children }: ProviderProps): ReactNode => {
  const [jobs, setJobs] = useState<PendingJob[]>([])
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

      const cipher = createCipher(encryptionPassword)
      const result = await restoreBackupAction(backupCid, dialogId, cipher, limit)
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

      const cipher = createCipher(encryptionPassword)
      const newMessages = await fetchMoreMessagesAction(restoredBackup.dialogData, cipher, offset, limit)
      setRestoredBackup((prev) => ({
        ...prev!,
        messages: [...prev!.messages, ...newMessages],
      }))
    } catch (err: any) {
      console.error('Error: fetching more messages', err)
      setRestoredBackupError(err)
    }
  }

  const addBackupJob = useCallback(
    (space: SpaceDID, dialogs: Set<bigint>, period: Period) => {
      if (!jobManager) throw new Error('missing job manager')
      return jobManager.add(space, dialogs, period)
    },
    [jobManager]
  )

  const removeBackupJob = useCallback(
    (id: JobID) => {
      if (!jobManager) throw new Error('missing job manager')
      return jobManager.remove(id)
    },
    [jobManager]
  )

  useEffect(() => {
    if (!jobStore) return

    const handleJobChange = async () => {
      console.debug('handling job change event...')

      try {
        setJobsError(undefined)
        console.debug('listing pending jobs...')
        const jobs = await jobStore.listPending()
        console.debug(`found ${jobs.items.length} pending jobs`)
        setJobs(jobs.items)
      } catch (err: any) {
        console.error('Error: handling job change event', err)
        setJobsError(err)
      }

      try {
        setBackupsError(undefined)
        console.debug('listing completed jobs...')
        const backups = await jobStore.listCompleted()
        console.debug(`found ${backups.items.length} completed jobs`)
        setBackups(backups.items)
      } catch (err: any) {
        console.error('Error: handling job change event', err)
        setBackupsError(err)
      }
    }

    ;(async () => {
      setBackupsLoading(true)
      setJobsLoading(true)
      try {
        console.debug('manually triggering job change to populate jobs and backups...')
        await handleJobChange()
      } finally {
        setBackupsLoading(false)
        setJobsLoading(false)
      }
    })()

    jobStore.addEventListener('add', handleJobChange)
    jobStore.addEventListener('replace', handleJobChange)
    jobStore.addEventListener('remove', handleJobChange)

    return () => {
      jobStore.removeEventListener('add', handleJobChange)
      jobStore.removeEventListener('replace', handleJobChange)
      jobStore.removeEventListener('remove', handleJobChange)
    }
  }, [jobStore])

  return (
    <Context.Provider value={[{ jobs: jobsResult, backups: backupsResult, restoredBackup: restoreBackupResult }, { addBackupJob, removeBackupJob, restoreBackup, fetchMoreMessages}]}>
      {children}
    </Context.Provider>
  )
}

export const useBackups = (): ContextValue => useContext(Context)
