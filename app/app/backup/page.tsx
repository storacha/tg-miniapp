'use client'

import { Layouts } from '@/components/layouts'
import Dates from '@/components/backup/dates'
import Chats from '@/components/backup/chats'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Connect } from '@/components/backup/connect'
import { useGlobal } from '@/zustand/global'
import { BackupHandler } from '@/components/backup/backup-handler'

export default function Page() {
	const [step, setStep] = useState(0)
	const [selectedChats, setSelectedChats] = useState<Set<bigint>>(new Set())
	const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date } | null>(null)
	const router = useRouter()
	const { isStrochaAuthorized } = useGlobal()

	function handleBack() {
		if (step === 0) {
			router.back()
		}
		setStep(step - 1)
	}

	return (
		<Layouts isSinglePage back={() => handleBack()}>
			{step === 0 && <Chats onSelectionChange={setSelectedChats} />}
			{step === 1 && <Dates onDateRangeChange={setDateRange} />}
			{step === 2 && dateRange && ( // TODO: also needs to check for the 'isStrochaAuthorized'
				<BackupHandler
					selectedChats={selectedChats}
					startDate={dateRange.startDate}
					endDate={dateRange.endDate}
				/>
			)}

			{step === 0 && (
				<div className="sticky bottom-0 w-full p-5">
					<Button className="w-full" onClick={() => setStep(step + 1)}>
						Continue
					</Button>
				</div>
			)}

			{step === 1 && !isStrochaAuthorized && <Connect />}
			{step === 1 && isStrochaAuthorized && (
				<div className="sticky bottom-0 w-full p-5">
					<Button className="w-full" onClick={() => setStep(step + 1)}>
						Continue Backup
					</Button>
				</div>
			)}
		</Layouts>
	)
}
