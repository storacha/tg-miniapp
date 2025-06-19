import {
  createContext,
  useContext,
  ReactNode,
  PropsWithChildren,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import { cloudStorage } from '@telegram-apps/sdk-react'
import {
  Backup,
  DialogsById,
  JobID,
  JobStorage,
  PendingJob,
  Period,
  RestoredBackup,
} from '@/api'
import { Client as StorachaClient } from '@storacha/ui-react'
import { TelegramClient } from '@/vendor/telegram'
import {
  restoreBackup as restoreBackupAction,
  fetchMoreMessages as fetchMoreMessagesAction,
} from '@/lib/backup/recoverer'
import { create as createCipher } from '@/lib/aes-cbc-cipher'
import { useError } from './error'
import { getErrorMessage } from '@/lib/errorhandling'

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

  // indicates whether we're ready to setup backups
  jobsReady: boolean
}

export interface ContextActions {
  addBackupJob: (
    chats: DialogsById,
    period: Period
  ) => Promise<JobID | undefined>
  removeBackupJob: (job: JobID) => Promise<void>
  restoreBackup: (
    backupCid: string,
    dialogId: string,
    limit: number
  ) => Promise<void>
  fetchMoreMessages: (limit: number) => Promise<void>
  cancelBackupJob: (job: JobID) => Promise<void>
  // setBackup: (id: Link|null) => void
  // setDialog: (id: bigint | null) => void
}

export type ContextValue = [state: ContextState, actions: ContextActions]

export const ContextDefaultValue: ContextValue = [
  {
    jobs: { items: [], loading: false },
    backups: { items: [], loading: false },
    restoredBackup: { items: [], loading: false },
    // messages: { items: [], loading: false },
    // media: { items: [], loading: false }
    jobsReady: false,
  },
  {
    addBackupJob: () => Promise.reject(new Error('provider not setup')),
    removeBackupJob: () => Promise.reject(new Error('provider not setup')),
    restoreBackup: () => Promise.reject(new Error('provider not setup')),
    fetchMoreMessages: () => Promise.reject(new Error('provider not setup')),
    cancelBackupJob: () => Promise.reject(new Error('provider not setup')),
    // setBackup: () => {},
    // setDialog: () => {}
  },
]

export const Context = createContext<ContextValue>(ContextDefaultValue)

export interface ProviderProps extends PropsWithChildren {
  jobs?: JobStorage
}

/**
 * Provider that enables initiating and tracking current and exiting backups.
 */
export const Provider = ({
  jobs: jobStore,
  children,
}: ProviderProps): ReactNode => {
  const { setError } = useError()
  const [jobs, setJobs] = useState<PendingJob[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState<Error>()
  const jobsResult = {
    items: jobs,
    loading: jobsLoading,
    error: jobsError,
  }

  const [jobsReady, setJobsReady] = useState(false)

  const [backups, setBackups] = useState<Backup[]>([])
  const [backupsLoading, setBackupsLoading] = useState(true)
  const [backupsError, setBackupsError] = useState<Error>()
  const backupsResult = {
    items: backups,
    loading: backupsLoading,
    error: backupsError,
  }

  const [restoreCache, setRestoreCache] = useState<
    Record<string, RestoredBackup>
  >({})
  const [restoredBackup, setRestoredBackup] = useState<RestoredBackup>()
  const [restoredBackupLoading, setRestoredBackupLoading] = useState(false)
  const [restoredBackupError, setRestoredBackupError] = useState<Error>()
  const restoreBackupResult = {
    items: [],
    item: restoredBackup,
    loading: restoredBackupLoading,
    error: restoredBackupError,
  }

  // Use useRef for cache to avoid unnecessary content reloads
  const restoreCacheRef = useRef(restoreCache)
  useEffect(() => {
    restoreCacheRef.current = restoreCache
  }, [restoreCache])

  const handleMediaLoaded = useCallback(
    (mediaCid: string, data: Uint8Array) => {
      setRestoredBackup((prev) => {
        if (!prev) return prev
        if (prev.mediaMap[mediaCid]) return prev

        const updatedMediaMap = { ...prev.mediaMap, [mediaCid]: data }
        return {
          ...prev,
          mediaMap: updatedMediaMap,
        }
      })
    },
    []
  )

  const restoreBackup = useCallback(
    async (backupCid: string, dialogId: string, limit: number) => {
      setRestoredBackupLoading(true)
      try {
        setRestoredBackupError(undefined)
        const cacheKey = `${backupCid}:${dialogId}`

        const cached = restoreCacheRef.current[cacheKey]
        if (cached) {
          setRestoredBackup(cached)
          setRestoredBackupLoading(false)
          return
        }

        if (!cloudStorage.getKeys.isAvailable) {
          throw new Error('Error trying to access cloud storage.')
        }

        const encryptionPassword = await cloudStorage.getItem(
          'encryption-password'
        )
        if (!encryptionPassword) {
          throw new Error('Encryption password not found in cloud storage')
        }

        const cipher = createCipher(encryptionPassword)

        const result = await restoreBackupAction(
          backupCid,
          dialogId,
          cipher,
          limit,
          handleMediaLoaded
        )
        console.log('restored backup:', result)
        setRestoredBackup(result)
        setRestoreCache((prev) => {
          const next = { ...prev, [cacheKey]: result }
          restoreCacheRef.current = next
          return next
        })
        setRestoredBackupError(undefined)
      } catch (err: unknown) {
        setRestoredBackupError(
          err instanceof Error ? err : new Error('Unknown error')
        )
      } finally {
        setRestoredBackupLoading(false)
      }
    },
    [handleMediaLoaded]
  )

  const fetchMoreMessages = useCallback(
    async (limit: number) => {
      if (!restoredBackup) {
        console.warn('fetchMoreMessages called without a restored backup')
        return
      }

      if (restoredBackup.isLoadingMore) {
        console.warn(
          'fetchMoreMessages called while already loading more messages'
        )
        return
      }

      setRestoredBackup((prev) => ({ ...prev!, isLoadingMore: true }))

      try {
        if (!cloudStorage.getKeys.isAvailable) {
          throw new Error('Error trying to access cloud storage.')
        }

        const encryptionPassword = await cloudStorage.getItem(
          'encryption-password'
        )
        if (!encryptionPassword) {
          throw new Error('Encryption password not found in cloud storage')
        }

        const cipher = createCipher(encryptionPassword)
        const result = await fetchMoreMessagesAction(
          restoredBackup.dialogData.messages,
          cipher,
          restoredBackup.lastBatchIndex,
          restoredBackup.lastMessageIndex,
          limit,
          handleMediaLoaded
        )

        setRestoredBackup((prev) => ({
          ...prev!,
          messages: [...prev!.messages, ...result.messages],
          mediaMap: { ...prev!.mediaMap, ...result.mediaMap },
          lastBatchIndex: result.lastBatchIndex,
          lastMessageIndex: result.lastMessageIndex,
          hasMoreMessages: result.hasMoreMessages,
          isLoadingMore: false,
        }))
      } catch (err: any) {
        console.error('Error: fetching more messages', err)
        setRestoredBackupError(err)
        setRestoredBackup((prev) => ({ ...prev!, isLoadingMore: false }))
      }
    },
    [restoredBackup, handleMediaLoaded]
  )

  const addBackupJob = useCallback(
    async (
      dialogs: DialogsById,
      period: Period
    ): Promise<string | undefined> => {
      if (!jobStore) {
        setError('missing job store')
        return undefined
      }
      try {
        const job = await jobStore.add(dialogs, period)
        return job.id
      } catch (error: any) {
        const msg = 'Error adding backup job!'
        console.error(msg, error)
        setError(getErrorMessage(error), { title: msg })
        return undefined
      }
    },
    [jobStore]
  )

  const removeBackupJob = useCallback(
    async (id: JobID) => {
      if (!jobStore) {
        setError('missing job store')
        return
      }
      try {
        await jobStore.remove(id)
      } catch (error: any) {
        const msg = 'Error removing backup job!'
        console.error(msg, error)
        setError(getErrorMessage(error), { title: msg })
      }
    },
    [jobStore]
  )

  const cancelBackupJob = useCallback(
    async (id: JobID) => {
      if (!jobStore) {
        setError('missing job store')
        return
      }
      try {
        await jobStore.cancel(id)
      } catch (error: any) {
        const msg = 'Error canceling backup job!'
        console.error(msg, error)
        setError(getErrorMessage(error), { title: msg })
      }
    },
    [jobStore]
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
        console.debug(
          'manually triggering job change to populate jobs and backups...'
        )
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

  useEffect(() => {
    setJobsReady(!!jobStore)
  }, [jobStore])
  return (
    <Context.Provider
      value={[
        {
          jobs: jobsResult,
          backups: backupsResult,
          restoredBackup: restoreBackupResult,
          jobsReady,
        },
        {
          addBackupJob,
          removeBackupJob,
          restoreBackup,
          fetchMoreMessages,
          cancelBackupJob,
        },
      ]}
    >
      {children}
    </Context.Provider>
  )
}

export const useBackups = (): ContextValue => useContext(Context)
