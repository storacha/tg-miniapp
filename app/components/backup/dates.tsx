import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Connect } from '@/components/backup/connect'

export default function Dates() {
	return (
		<div>
			<div className="w-full pt-5 px-5 flex flex-col text-center justify-center gap-2 pb-10 border-b border-primary/10">
				<h1 className="text-xl font-semibold text-foreground text-center">Backup Chats</h1>
				<p className="text-sm">Choose a time range to back up your chats.</p>
			</div>
			<div className="rounded-t-xl w-full flex-grow py-2">
				<RadioGroup defaultValue="fifteenDays" className="px-5">
					<div className="flex space-x-2 items-center gap-2 py-4 border-b border-primary/10">
						<RadioGroupItem value="fifteenDays" id="fifteenDays" />
						<Label htmlFor="fifteenDays">Last 15 days</Label>
					</div>
					<div className="flex space-x-2 items-center gap-2 py-4 border-b border-primary/10">
						<RadioGroupItem value="oneMonth" id="oneMonth" />
						<Label htmlFor="oneMonth">Last 1 month</Label>
					</div>
					<div className="flex space-x-2 items-center gap-2 py-4 border-b border-primary/10">
						<RadioGroupItem value="sixMonth" id="sixMonth" />
						<Label htmlFor="sixMonth">Last 6 month</Label>
					</div>
					<div className="flex space-x-2 items-center gap-2 py-4 border-b border-primary/10">
						<RadioGroupItem value="allChats" id="allChats" />
						<Label htmlFor="allChats">All Chats</Label>
					</div>
				</RadioGroup>
			</div>
			<Connect />
		</div>
	)
}
