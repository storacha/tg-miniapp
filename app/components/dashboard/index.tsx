import Head from './head'
import BackedChats from './backed-chats'
import { Button } from '../ui/button'
// import Backup from './backup'
// import Points from './points'

export default function Dashboard() {
	return (
		<div className="w-full flex items-center flex-col h-full">
			<div className="w-full px-5">
				<Head />
			</div>
			<div className="rounded-t-xl bg-background flex-grow w-full shadow-t-xl mt-5 pt-5">
				<BackedChats />
			</div>
			<div className="sticky bottom-0 bg-white w-full px-5 pb-5">
				<Button className="w-full">Start New Backup</Button>
			</div>
		</div>
	)
}
