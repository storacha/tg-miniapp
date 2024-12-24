'use client'

import Logo from '@/components/svgs/logo'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

function StepOne() {
	return (
		<div className="flex flex-col items-center gap-2">
			<div className="py-10">
				<Logo />
			</div>
			<h1 className="text-xl font-semibold">Backup Chats</h1>
			<p className="text-center">Connect with multiple members in group chats.</p>
		</div>
	)
}

function StepTwo() {
	return (
		<div className="flex flex-col items-center gap-2">
			<div className="py-10">
				<Logo />
			</div>
			<h1 className="text-xl font-semibold">Rewards</h1>
			<p className="text-center">Connect with multiple members in group chats.</p>
		</div>
	)
}

export default function Page() {
	const [step, setStep] = useState(1)
	const { push } = useRouter()

	return (
		<div className="py-20 px-5 flex flex-col items-stretch justify-between h-screen bg-primary/10">
			<h1 className="text-primary font-semibold text-2xl text-center">Storacha</h1>
			{step === 1 && <StepOne />}
			{step === 2 && <StepTwo />}
			<div className="flex justify-center items-center">
				<Button onClick={step === 1 ? () => setStep(2) : () => push('/')}>Next</Button>
			</div>
		</div>
	)
}
