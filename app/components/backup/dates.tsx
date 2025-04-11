import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Connect } from '@/components/backup/connect'

export type Period = [from: number, to: number]

export interface DatesProps {
	period: Period
	onPeriodChange: (period: Period) => unknown
}

const day = 1000 * 60 * 60 * 24
const month = 30 * day

const durationNames: Record<string, number> = {
	twoWeeks: 2 * 7 * day,
	month,
	sixMonths: 6 * month,
	allTime: Infinity
}

const durationValues =
	Object.fromEntries(Object.entries(durationNames).map(([k, v]) => [v, k]))

const toDurationName = ([from, to]: [number, number]) => 
	durationValues[to - from] ?? 'allTime'

export default function Dates({ period, onPeriodChange }: DatesProps) {
	const handleValueChange = (value: string) => {
		const d = durationNames[value] ?? Infinity
		const now = Date.now()
		onPeriodChange(d === Infinity ? [0, Infinity] : [now - d, now])
	}

	return (
		<div>
			<div className="w-full pt-5 px-5 flex flex-col text-center justify-center gap-2 pb-10 border-b border-primary/10">
				<h1 className="text-xl font-semibold text-foreground text-center">Backup Chats</h1>
				<p className="text-sm">Choose a time range to back up your chats.</p>
			</div>
			<div className="rounded-t-xl w-full flex-grow py-2">
				<RadioGroup value={toDurationName(period)} onValueChange={handleValueChange} className="px-5">
					<div className="flex space-x-2 items-center gap-2 border-b border-primary/10">
						<RadioGroupItem value="twoWeeks" id="twoWeeks" />
						<Label htmlFor="twoWeeks" className="flex-auto py-4">Last 2 weeks</Label>
					</div>
					<div className="flex space-x-2 items-center gap-2 border-b border-primary/10">
						<RadioGroupItem value="month" id="month" />
						<Label htmlFor="month" className="flex-auto py-4">Last month</Label>
					</div>
					<div className="flex space-x-2 items-center gap-2 border-b border-primary/10">
						<RadioGroupItem value="sixMonths" id="sixMonths" />
						<Label htmlFor="sixMonths" className="flex-auto py-4">Last 6 months</Label>
					</div>
					<div className="flex space-x-2 items-center gap-2 border-b border-primary/10">
						<RadioGroupItem value="allTime" id="allTime" />
						<Label htmlFor="allTime" className="flex-auto py-4">All time</Label>
					</div>
				</RadioGroup>
			</div>
		</div>
	)
}
