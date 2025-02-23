import Head from './head'
import BackedChats from './backed-chats'
import { Button } from '../ui/button'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
	const router = useRouter()
	return (
		<div className="w-full flex items-center flex-col h-full">
			<div className="w-full px-5">
				<Head />
			</div>
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
