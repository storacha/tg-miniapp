'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import Image from 'next/image'
import { useGlobal } from '@/zustand/global'

function StepOne() {
	return (
		<div className="flex flex-col items-center gap-2">
			<div className="py-10">
				<Image src="/secure-chat.png" alt="secure-chat" width={300} height={300} />
			</div>
			<h1 className="text-xl font-semibold">Backup Chats</h1>
			<p className="text-center">Secure your conversations with one tap</p>
		</div>
	)
}

function StepTwo() {
	return (
		<div className="flex flex-col items-center gap-2">
			<div className="py-10">
				<Image src="/racha-points.png" alt="racha-points" width={300} height={300} />
			</div>
			<h1 className="text-xl font-semibold">Earn Racha Points</h1>
			<p className="text-center">Collect rewards for every backup</p>
		</div>
	)
}

export default function Onboarding() {
	const [step, setStep] = useState(1)
	const { push } = useRouter()
	const { setIsOnboarded } = useGlobal()

	const handleNext = useCallback(() => {
		if (step === 1) {
			setStep(2)
		} else {
			setIsOnboarded(true)
			push('/')
		}
	}, [push, setIsOnboarded, step])

	return (
		<div className="py-20 px-5 flex flex-col items-stretch justify-between h-screen bg-primary/10">
			<h1 className="text-primary font-semibold text-2xl text-center">Storacha</h1>
			{step === 1 && <StepOne />}
			{step === 2 && <StepTwo />}
			<div className="flex justify-center items-center">
				<Button onClick={handleNext}>Next</Button>
			</div>
		</div>
	)
}
