'use client'

import { useEffect, useState, type PropsWithChildren } from 'react'
import { useDidMount } from '../hooks/useDidMount'
import { ErrorBoundary } from './error-boundary'
import { ErrorPage } from './error-page'
import LogoSplash from './svgs/logo-splash'
import { Provider as TelegramProvider, useTelegram } from '@/providers/telegram'
import { cloudStorage, init, restoreInitData } from '@telegram-apps/sdk-react'
import { Provider as StorachaProvider, useW3 as useStoracha } from '@storacha/ui-react'
import { uploadServiceConnection, defaultHeaders } from '@storacha/client/service'
import { Name } from '@storacha/ucn'
import { parse as parseDID } from '@ipld/dag-ucan/did'
import { Provider as BackupProvider } from '@/providers/backup'
import { generateRandomPassword } from '@/lib/crypto'
import { create as createJobManager } from '@/lib/backup/manager'
import { create as createObjectStorage } from '@/lib/store/object'
import { create as createJobStorage } from '@/lib/store/jobs'
import { create as createCipher } from '@/lib/aes-cbc-cipher'
import { create as createRemoteStorage } from '@/lib/store/remote'
import { JobStorage, JobManager, JobID, Job } from '@/api'
import Onboarding from '@/components/onboarding'
import TelegramAuth from '@/components/telegram-auth'
import { useGlobal } from '@/zustand/global'

const apiId = parseInt(process.env.NEXT_PUBLIC_TELEGRAM_API_ID ?? '')
const apiHash = process.env.NEXT_PUBLIC_TELEGRAM_API_HASH ?? ''
const version = process.env.NEXT_PUBLIC_VERSION ?? '0.0.0'

// TODO: Temporary, until service respects `did:web:up.storacha.network`
const serviceID = parseDID('did:web:web3.storage')
// TODO: Temporary, until service respects `did:web:up.storacha.network`
const connection = uploadServiceConnection({ id: serviceID })
// Add the miniapp identifier to the client header
defaultHeaders['X-Client'] += ` tg-miniapp/${version.split('.')[0]}`

// Initialize telegram react SDK
if (typeof window !== 'undefined') {
	init()
	restoreInitData()
}

export function Root(props: PropsWithChildren) {
	const didMount = useDidMount()
	const { isOnboarded, isTgAuthorized } = useGlobal()

	if (!didMount) {
		return (
			<div className="h-screen flex justify-center items-center bg-primary">
				<LogoSplash />
			</div>
		)
	}

	if (!isOnboarded) {
		return <Onboarding />
	}

	return (
		<ErrorBoundary fallback={ErrorPage}>
			<TelegramProvider apiId={apiId} apiHash={apiHash}>
				{isTgAuthorized ? (
					<StorachaProvider servicePrincipal={serviceID} connection={connection}>
						<BackupProviderContainer>
							<div {...props} />
						</BackupProviderContainer>
					</StorachaProvider>
				) : (
					<TelegramAuth />
				)}
			</TelegramProvider>
		</ErrorBoundary>
	)
}

const BackupProviderContainer = ({ children }: PropsWithChildren) => {
	const [{ client: storacha }] = useStoracha()
	const [{ client: telegram }] = useTelegram()
	const { isStorachaAuthorized, space } = useGlobal()
	const [jobManager, setJobManager] = useState<JobManager>()
	const [jobs, setJobs] = useState<JobStorage>()

	useEffect(() => {
		if (!storacha || !telegram || !isStorachaAuthorized || !space) {
			return
		}
		;(async () => {
			let encryptionPassword = await cloudStorage.getItem('encryption-password')
			if (encryptionPassword === '') {
				console.log('creating new encryption password')
				encryptionPassword = generateRandomPassword()
				await cloudStorage.setItem('encryption-password', encryptionPassword)
			} else {
				console.log('found existing encryption password')
			}

			await storacha.setCurrentSpace(space)

			const proofs = storacha.proofs([
				{ can: 'clock/head', with: space },
				{ can: 'clock/advance', with: space }
			])
			if (!proofs.length) {
				throw new Error('merkle clock proofs not found')
			}

			const cipher = createCipher(encryptionPassword)
			const remoteStore = createRemoteStorage(storacha)
			const name = Name.from(storacha.agent.issuer, proofs, { id: space })
			const store = createObjectStorage<Record<JobID, Job>>({ remoteStore, name, cipher })

			const jobs = await createJobStorage({ store })
			const jobManager = await createJobManager({ storacha, telegram, jobs, cipher })

			setJobs(jobs)
			setJobManager(jobManager)
		})()
	}, [storacha, telegram, isStorachaAuthorized, space])

	return (
		<BackupProvider jobManager={jobManager} jobs={jobs}>
			{children}
		</BackupProvider>
	)
}
