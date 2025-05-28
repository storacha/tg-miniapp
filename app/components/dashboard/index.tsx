import { useState } from 'react'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useW3 as useStoracha } from '@storacha/ui-react'
import { email as parseEmail } from '@storacha/did-mailto'
import { JobID, PendingJob } from '@/api'
import { useGlobal } from '@/zustand/global'
import { useBackups } from '@/providers/backup'
import { useTelegram } from '@/providers/telegram'
import Head from '@/components/dashboard/head'
import { Button } from '@/components/ui/button'
import { StorachaConnect } from '@/components/backup/connect'
import BackedChats from '@/components/dashboard/backed-chats'

const spaceNamePrefix = 'Telegram Backups'

export default function Dashboard() {
	const router = useRouter()
	const [{ user }] = useTelegram()
	const [{ client }] = useStoracha()
	const [{ jobs }, { removeBackupJob }] = useBackups()
	const { isStorachaAuthorized, setIsStorachaAuthorized, setSpace } = useGlobal()
	
	const [email, setEmail] = useState('')
	const [connErr, setConnErr] = useState<Error>()
	const [verifying, setVerifying] = useState(false)

		const handleConnectSubmit = async () => {
			try {
				if (!client) throw new Error('missing Storacha client instance')
				setConnErr(undefined)
				setVerifying(true)
	
				const spaceName = `${spaceNamePrefix} (${user?.id})`
				const account = await client.login(parseEmail(email))
				const space = client.spaces().find(s => s.name === spaceName)
				if (space) {
					await client.setCurrentSpace(space.did())
					setSpace(space.did())
				} else {
					await account.plan.wait()
					const space = await client.createSpace(spaceName, { account })
					await client.setCurrentSpace(space.did())
					setSpace(space.did())
				}
				setIsStorachaAuthorized(true)
			} catch (err) {
				console.error(err)
				setConnErr(err as Error)
			} finally {
				setVerifying(false)
			}
		}

	return (
		<div className="w-full flex items-center flex-col h-full">
			<div className="w-full px-5 mb-5">
				<Head />
			</div>
			{jobs.items.map(j => <JobItem key={j.id} job={j} onRemove={removeBackupJob} />)}
			<div className="rounded-t-xl bg-background flex-grow w-full shadow-t-xl pt-5">
				<BackedChats />
			</div>
			<div className="sticky bottom-0 bg-white w-full px-5 pb-5">
				{ isStorachaAuthorized ?
					<Button className="w-full" onClick={() => router.push('/backup')}>
						Start New Backup
					</Button>
				: (
					<StorachaConnect
						open={!isStorachaAuthorized}
						email={email}
						onEmailChange={setEmail}
						onConnect={handleConnectSubmit}
						error={connErr}
						verifying={verifying}
						onErrorDismiss={() => setConnErr(undefined)}
					/>
				)}
			</div>
		</div>
	)
}

const JobItem = ({ job, onRemove }: { job: PendingJob, onRemove: (id: JobID) => unknown }) => {
	const progress = job.status === 'running' || job.status === 'failed' ? job.progress : 0
	return (
		<div className="w-full px-5 mb-5">
			<div className="w-full bg-background rounded-sm border">
				<div className="flex justify-between items-center px-5 pt-3">
					<p>Backup <span className="capitalize">{job.status}</span></p>
					{job.status === 'failed' && <button onClick={() => onRemove(job.id)}><X /></button>}
				</div>
				{job.status === 'failed' && job.cause && <p className='px-5 pt-1 text-red-900 text-xs'>Error: {job.cause}</p>}
				<div className="flex justify-between items-center px-3 py-3">
					<div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
						<div className="bg-blue-900 h-2.5 rounded-full transition-all" style={{ width: `${progress * 100}%` }}></div>
					</div>
				</div>
				<div className="flex justify-between items-center px-3 pb-4">
					<span className="text-muted-foreground text-xs">{Math.floor(progress * 100)}% Completed</span>
					<span className="text-muted-foreground text-xs">{job.params.dialogs.length} Chat{job.params.dialogs.length > 1 ? 's' : ''} Backing Up</span>
				</div>
			</div>
		</div>
	)
}
