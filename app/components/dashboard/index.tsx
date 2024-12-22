import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Head from './head'
import Home from './home'
import Backup from './backup'
import Points from './points'

export default function Dashboard() {
	return (
		<Tabs defaultValue="account" className="w-full flex items-center flex-col h-full">
			<div className="py-5 w-full px-5">
				<Head />
			</div>
			<div className=" rounded-t-xl bg-red-100 w-full h-full p-5 shadow-xl">
				<Home />
				<Backup />
				<Points />
			</div>
		</Tabs>
	)
}
