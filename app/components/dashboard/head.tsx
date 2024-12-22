import { TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Head() {
	return (
		<TabsList className="min-w-full">
			<TabsTrigger className="w-full" value="home">
				Home
			</TabsTrigger>
			<TabsTrigger className="w-full" value="backup">
				Backup
			</TabsTrigger>
			<TabsTrigger className="w-full" value="points">
				Points
			</TabsTrigger>
		</TabsList>
	)
}
