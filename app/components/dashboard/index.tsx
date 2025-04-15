import { X } from 'lucide-react'
// import Head from './head'
import BackedChats from './backed-chats'
import { Button } from '../ui/button'
import { useRouter } from 'next/navigation'
import { useBackups } from '@/providers/backup'
import { Job, JobID } from '@/api'

export default function Dashboard() {
	const router = useRouter()
	const [{ jobs }, { removeBackupJob }] = useBackups()

	return (
		<div className="w-full flex items-center flex-col h-full">
			{/* <div className="w-full px-5">
				<Head />
			</div> */}
			{jobs.items.map(j => <JobItem key={j.id} job={j} onRemove={removeBackupJob} />)}
			<div className="rounded-t-xl bg-background flex-grow w-full shadow-t-xl pt-5">
				<BackedChats />
			</div>
			<div className="sticky bottom-0 bg-white w-full px-5 pb-5">
				<Button className="w-full" onClick={() => router.push('/backup')}>
					Start New Backup
				</Button>
			</div>
		</div>
	)
}

const JobItem = ({ job, onRemove }: { job: Job, onRemove: (id: JobID) => unknown }) => {
	return (
		<div className="w-full px-5 mb-5">
			<div className="w-full bg-background rounded-sm border">
				<div className="flex justify-between items-center px-5 pt-3">
					<p>Backup <span className="capitalize">{job.state}</span></p>
					{job.state === 'failed' && <button onClick={() => onRemove(job.id)}><X /></button>}
				</div>
				{job.error && <p className='px-5 pt-1 text-red-900 text-xs'>Error: {job.error}</p>}
				<div className="flex justify-between items-center px-3 py-3">
					<div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
						<div className="bg-blue-900 h-2.5 rounded-full transition-all" style={{ width: `${job.progress * 100}%` }}></div>
					</div>
				</div>
				<div className="flex justify-between items-center px-3 pb-4">
					<span className="text-muted-foreground text-xs">{Math.floor(job.progress * 100)}% Completed</span>
					<span className="text-muted-foreground text-xs">{job.dialogs.size} Chat{job.dialogs.size > 1 ? 's' : ''} Backing Up</span>
				</div>
			</div>
		</div>
	)
}
