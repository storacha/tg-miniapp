'use client'

import { useEffect, useState, PropsWithChildren } from 'react'
import { cloudStorage, init, restoreInitData } from '@telegram-apps/sdk-react'
import {
  Provider as StorachaProvider,
  useW3 as useStoracha,
} from '@storacha/ui-react'
import {
  uploadServiceConnection,
  defaultHeaders,
} from '@storacha/client/service'
import { parse as parseDID } from '@ipld/dag-ucan/did'
import { StringSession, StoreSession } from '@/vendor/telegram/sessions'
import { JobStorage } from '@/api'
import { useGlobal } from '@/zustand/global'
import { parseWithUIntArrays } from '@/lib/utils'
import { generateRandomPassword } from '@/lib/crypto'
import { create as createJobStorage } from '@/lib/store/jobs'
import { fromResult } from '@/lib/errorhandling'
import Onboarding from '@/components/onboarding'
import { ErrorProvider, useError } from '@/providers/error'
import { Provider as BackupProvider } from '@/providers/backup'
import { Provider as TelegramProvider, useTelegram } from '@/providers/telegram'
import {
  createJob,
  findJob,
  listJobs,
  login,
  removeJob,
  cancelJob,
  deleteDialogFromJob,
  storeInitData,
} from './server'
import { ErrorPage } from './error'
import TelegramAuth from './telegram-auth'
import LogoSplash from './svgs/logo-splash'
import { ErrorBoundary } from './error-boundary'

const version = process.env.NEXT_PUBLIC_VERSION ?? '0.0.0'
const serverDID = parseDID(process.env.NEXT_PUBLIC_SERVER_DID ?? '')

// TODO: Temporary, if it's not forced the default provider is still set to did:web:web3.storage
const serviceID = parseDID('did:web:up.storacha.network')
// TODO: Temporary, until service respects `did:web:up.storacha.network`
const connection = uploadServiceConnection({ id: serviceID })
// Add the miniapp identifier to the client header
defaultHeaders['X-Client'] += ` tg-miniapp/${version.split('.')[0]}`

export function Root(props: PropsWithChildren) {
  const [initError, setInitError] = useState<Error | null>(null)
  const [{ isTgAuthorized }] = useTelegram()
  const { isOnboarded, tgSessionString, setTgSessionString, user } = useGlobal()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        init()
        restoreInitData()
      } catch (e) {
        setInitError(new Error('Could not initialized TG SDK', { cause: e }))
      }
    }
  }, [])

  useEffect(() => {
    if (isTgAuthorized && !tgSessionString && user) {
      console.log('setting session')
      const defaultSessionName = `tg-session-${user.id}`
      const session =
        typeof localStorage !== 'undefined'
          ? new StoreSession(defaultSessionName)
          : new StringSession()
      setTgSessionString(session)
    }
  }, [isTgAuthorized, tgSessionString, user, setTgSessionString])

  if (initError) {
    return <ErrorPage error={initError} />
  }

  if (!isOnboarded) {
    return <Onboarding />
  }

  return (
    <ErrorBoundary fallback={ErrorPage}>
      <ErrorProvider>
        <TelegramProvider>
          <AppContent {...props} />
        </TelegramProvider>
      </ErrorProvider>
    </ErrorBoundary>
  )
}

const AppContent = (props: PropsWithChildren) => {
  const [{ isTgAuthorized, isValidating }] = useTelegram()

  if (isValidating) {
    return (
      <div className="h-screen flex justify-center items-center bg-primary">
        <LogoSplash />
      </div>
    )
  }

  return (
    <>
      {isTgAuthorized ? (
        <StorachaProvider servicePrincipal={serviceID} connection={connection}>
          <BackupProviderContainer>
            <div {...props} />
          </BackupProviderContainer>
        </StorachaProvider>
      ) : (
        <TelegramAuth />
      )}
    </>
  )
}

const BackupProviderContainer = ({ children }: PropsWithChildren) => {
  const [{ client: storacha }] = useStoracha()
  const [{ launchParams }] = useTelegram()
  const {
    isStorachaAuthorized,
    space,
    tgSessionString,
    setIsFirstLogin,
    user,
  } = useGlobal()
  const [jobs, setJobs] = useState<JobStorage>()
  const { setError } = useError()

  useEffect(() => {
    let eventSource: EventSource
    ;(async () => {
      let encryptionPassword = await cloudStorage.getItem('encryption-password')
      setIsFirstLogin(!encryptionPassword)

      if (
        !storacha ||
        !tgSessionString ||
        !isStorachaAuthorized ||
        !space ||
        !user
      ) {
        return
      }

      if (!encryptionPassword) {
        console.log('creating new encryption password')
        encryptionPassword = generateRandomPassword()
        await cloudStorage.setItem('encryption-password', encryptionPassword)
      } else {
        console.log('found existing encryption password')
      }

      console.log('default provider: ', storacha?.defaultProvider())
      await storacha.setCurrentSpace(space)

      try {
        fromResult(await storeInitData(launchParams.initDataRaw || ''))
        fromResult(
          await login({
            session: tgSessionString,
            spaceDID: space,
            accountDID: user.accountDID,
          })
        )
      } catch (err) {
        setError(err, { title: 'Error logging in!' })
        return
      }

      const jobs = await createJobStorage({
        serverDID: serverDID,
        accountDID: user.accountDID,
        storacha,
        encryptionPassword,
        jobClient: {
          createJob: async (jr) => fromResult(await createJob(jr)),
          findJob: async (jr) => fromResult(await findJob(jr)),
          listJobs: async (jr) => fromResult(await listJobs(jr)),
          removeJob: async (jr) => fromResult(await removeJob(jr)),
          cancelJob: async (jr) => fromResult(await cancelJob(jr)),
          deleteDialogFromJob: async (jr) =>
            fromResult(await deleteDialogFromJob(jr)),
        },
      })
      // setup a remove listener for async updates
      eventSource = new EventSource('/api/jobs')
      eventSource.addEventListener('replace', (evt) => {
        const job = parseWithUIntArrays(evt.data)
        jobs.dispatchEvent(new CustomEvent('replace', { detail: job }))
      })
      setJobs(jobs)
    })()
    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [storacha, tgSessionString, isStorachaAuthorized, space])

  return <BackupProvider jobs={jobs}>{children}</BackupProvider>
}
