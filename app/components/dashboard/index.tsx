import { Tabs } from '@/components/ui/tabs'
import Head from './head'
import Home from './home'
import Backup from './backup'
import Points from './points'

export default function Dashboard() {
	return (
		<Tabs defaultValue="account" className="w-full flex items-center flex-col h-full gap-10">
			<div className="w-full pt-5 px-5">
				<Head />
			</div>
			<div className="rounded-t-xl bg-background w-full h-full shadow-xl py-5">
				<Home />
				<Backup />
				<Points />
			</div>
		</Tabs>
	)
}
