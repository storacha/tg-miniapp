'use client'

import { useEffect, useState, type PropsWithChildren } from 'react'
import { useDidMount } from '../hooks/useDidMount'
import { ErrorBoundary } from './error-boundary'
import { ErrorPage } from './error-page'
import LogoSplash from './svgs/logo-splash'
import { Provider as TelegramProvider, useTelegram } from '@/providers/telegram'
import { cloudStorage, init, restoreInitData } from '@telegram-apps/sdk-react'
import { Provider as StorachaProvider, useW3 as useStoracha } from '@storacha/ui-react'
import { uploadServiceConnection } from '@storacha/client/service'
import { parse as parseDID } from '@ipld/dag-ucan/did'
import { Provider as BackupProvider } from '@/providers/backup'
import { generateRandomPassword } from '@/lib/crypto'
import { create as createJobManager } from '@/lib/backup/manager'
import { create as createJobStorage } from '@/lib/store/localstorage-jobs'
import { create as createBackupStorage } from '@/lib/store/cloudstorage-backups'
import { JobStorage, BackupStorage, JobManager } from '@/api'
import Onboarding from '@/components/onboarding'
import TelegramAuth from '@/components/telegram-auth'
import { useGlobal } from '@/zustand/global'

const apiId = parseInt(process.env.NEXT_PUBLIC_TELEGRAM_API_ID ?? '')
const apiHash = process.env.NEXT_PUBLIC_TELEGRAM_API_HASH ?? ''

// TODO: Temporary, until service respects `did:web:up.storacha.network`
const serviceID = parseDID('did:web:web3.storage')
// TODO: Temporary, until service respects `did:web:up.storacha.network`
const connection = uploadServiceConnection({ id: serviceID })

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
	const [jobManager, setJobManager] = useState<JobManager>()
	const [jobs, setJobs] = useState<JobStorage>()
	const [backups, setBackups] = useState<BackupStorage>()

	useEffect(() => {
		console.log({ storacha, telegram })
		if (!storacha || !telegram) {
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

			const jobs = createJobStorage()
			const backups = createBackupStorage()
			const jobManager = await createJobManager({ storacha, telegram, jobs, backups, encryptionPassword })

			setJobs(jobs)
			setBackups(backups)
			setJobManager(jobManager)
		})()
	}, [storacha, telegram])

	if (!jobManager || !jobs || !backups) {
		return null
	}

	return (
		<BackupProvider jobManager={jobManager} jobs={jobs} backups={backups}>
			{children}
		</BackupProvider>
	)
}
