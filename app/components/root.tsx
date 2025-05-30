'use client'

import { useEffect, useState, type PropsWithChildren } from 'react'
import { useDidMount } from '../hooks/useDidMount'
import { ErrorBoundary } from './error-boundary'
import { ErrorPage } from './error'
import LogoSplash from './svgs/logo-splash'
import { Provider as TelegramProvider, useTelegram } from '@/providers/telegram'
import { cloudStorage, init, restoreInitData } from '@telegram-apps/sdk-react'
import { Provider as StorachaProvider, useW3 as useStoracha } from '@storacha/ui-react'
import { uploadServiceConnection, defaultHeaders } from '@storacha/client/service'
import { parse as parseDID } from '@ipld/dag-ucan/did'
import { Provider as BackupProvider } from '@/providers/backup'
import { generateRandomPassword } from '@/lib/crypto'
import { JobStorage } from '@/api'
import Onboarding from '@/components/onboarding'
import TelegramAuth from '@/components/telegram-auth'
import { useGlobal } from '@/zustand/global'
import { createJob, findJob, listJobs, login, removeJob } from './server'
import { create as createJobStorage} from '@/lib/store/jobs'
import { StringSession, StoreSession } from "@/vendor/telegram/sessions"
import { parseResult, fromResult } from '@/lib/errorhandling'
import { parseWithUIntArrays } from '@/lib/utils'
import { ErrorProvider, useError } from '@/providers/error'

const version = process.env.NEXT_PUBLIC_VERSION ?? '0.0.0'
const serverDID = parseDID(process.env.NEXT_PUBLIC_SERVER_DID ?? '')

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
	const { isOnboarded, isTgAuthorized, tgSessionString, setTgSessionString} = useGlobal()

	useEffect(() => {
		if(isTgAuthorized && !tgSessionString) {
			console.log('setting session')
			const defaultSessionName = 'tg-session'
			const session = (typeof localStorage !== 'undefined' ? new StoreSession(defaultSessionName) : new StringSession())
			setTgSessionString(session)
		}
		
	}, [tgSessionString])

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
			<ErrorProvider>
				<TelegramProvider>
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
			</ErrorProvider>
		</ErrorBoundary>
	)
}

const BackupProviderContainer = ({ children }: PropsWithChildren) => {

	const [{ client: storacha }] = useStoracha()
	const [{ launchParams }] = useTelegram()
	const { isStorachaAuthorized, space, tgSessionString } = useGlobal()
	const [ jobs, setJobs ] = useState<JobStorage>()
	const { setError } = useError()

	useEffect(() => {

		let eventSource : EventSource
		if (!storacha || !tgSessionString || !isStorachaAuthorized || !space) {
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

			const loginRes = parseResult(await login({
				telegramAuth: {
					session: tgSessionString,
					initData: launchParams.initDataRaw || '',
				},
				spaceDID: space
			}))
			if (loginRes.error) {
				setError(loginRes.error)
				return
			}

			const jobs = await createJobStorage({
				serverDID: serverDID,
				storacha,
				encryptionPassword,
				jobClient: {
					createJob: async (jr) => fromResult(await createJob(jr)),
					findJob: async(jr) => fromResult(await findJob(jr)),
					listJobs: async(jr) => fromResult(await listJobs(jr)),
					removeJob: async(jr) => fromResult(await removeJob(jr))
				}
			})
			// setup a remove listener for async updates
			eventSource = new EventSource("/api/jobs")
			eventSource.addEventListener('replace', (evt) => {
					const job = parseWithUIntArrays(evt.data)
					jobs.dispatchEvent(new CustomEvent('replace', { detail: job}))
				})
			setJobs(jobs)
		})()
		return () => {
			if (eventSource) {
				eventSource.close()
			}
		}
	}, [storacha, tgSessionString, isStorachaAuthorized, space])

	return (
		<BackupProvider jobs={jobs}>
			{children}
		</BackupProvider>
	)
}
