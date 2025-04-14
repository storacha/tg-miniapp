import Head from './head'
import BackedChats from './backed-chats'
import { Button } from '../ui/button'
import { useRouter } from 'next/navigation'
import { useBackups } from '@/providers/backup'
import { Job } from '@/api'

export default function Dashboard() {
	const router = useRouter()
	const [{ jobs }] = useBackups()

	return (
		<div className="w-full flex items-center flex-col h-full">
			<div className="w-full px-5">
				<Head />
			</div>
			{jobs.items.map(j => <JobItem key={j.id} job={j} />)}
			<div className="rounded-t-xl bg-background flex-grow w-full shadow-t-xl mt-5 pt-5">
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

const JobItem = ({ job }: { job: Job }) => {
	return (
		<div className="w-full px-5">
			<div className="w-full mt-5 bg-background rounded-sm border">
				<p className="px-5 pt-3">Backup <span className="capitalize">{job.state}</span></p>
				<div className="flex justify-between items-center px-3 py-3">
					<div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
						<div className="bg-blue-900 h-2.5 rounded-full transition-all" style={{ width: `${job.progress * 100}%` }}></div>
					</div>
				</div>
				<div className="flex justify-between items-center px-3 pb-4">
					<span className="text-muted-foreground text-xs">{Math.floor(job.progress * 100)}% Completed</span>
					<span className="text-muted-foreground text-xs">{job.dialogs.size} Chats Backing Up</span>
				</div>
			</div>
		</div>
	)
}
