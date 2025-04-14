import { useState, useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '../ui/button'
import { FormEventHandler } from 'react'
import { Period } from '@/api'

export interface DatesProps {
	period: Period
	onPeriodChange: (period: Period) => unknown
	onSubmit: () => unknown
}

const day = 60 * 60 * 24 // in seconds
const month = 30 * day // in seconds

const durationNames: Record<string, number> = {
	twoWeeks: 2 * 7 * day,
	month,
	sixMonths: 6 * month
}

const durationValues =
	Object.fromEntries(Object.entries(durationNames).map(([k, v]) => [v, k]))

const toDurationName = ([from, to]: Period) => 
	durationValues[(to ?? Infinity) - from] ?? 'allTime'

export default function Dates({ period, onPeriodChange, onSubmit }: DatesProps) {
	const handleValueChange = (value: string) => {
		const d = durationNames[value]
		const now = Math.floor(Date.now() / 1000)
		onPeriodChange(d ? [now - d, now] : [0])
	}

	const handleSubmit: FormEventHandler = e => {
		e.preventDefault()
		onSubmit()
	}

	return (
		<form onSubmit={handleSubmit}>
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
			<div className="sticky bottom-0 w-full p-5">
				<Button type="submit" className="w-full">Continue</Button>
			</div>
		</form>
	)
}
