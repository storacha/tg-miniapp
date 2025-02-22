'use client'

import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { authTelegram } from '@/apis/authTelegram'
import { useGlobal } from '@/zustand/global'

function CountDown({ handleSendPin }: { handleSendPin: () => void }) {
	const [count, setCount] = useState(59)
	const [resend, setResend] = useState(false)

	function handleResend() {
		handleSendPin()
		setCount(59)
		setResend(false)
	}

	useEffect(() => {
		const timer = setInterval(() => {
			setCount((prev) => prev - 1)
		}, 1000)
		return () => clearInterval(timer)
	}, [])

	useEffect(() => {
		if (count === 0) {
			setResend(true)
		}
	}, [count])

	if (resend) {
		return (
			<Button size="sm" onClick={handleResend}>
				Resend
			</Button>
		)
	}

	return <p className="text-xl font-semibold">00:{count}</p>
}

function SubmitOTP({ handleSendPin }: { handleSendPin: () => void }) {
	const [OTP, setOTP] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	const { setIsTgAuthorized } = useGlobal()

	async function submitOTP() {
		try {
			setLoading(true)
			setIsTgAuthorized(true)
			setLoading(true)
		} catch (error) {
			setLoading(false)
		}
	}

	const disabled = OTP === null || OTP.length < 4 || loading

	return (
		<div className="pt-20 pb-10 px-5 flex flex-col items-stretch justify-between h-screen bg-background">
			<div className="flex flex-col items-center gap-2">
				<h1 className="text-primary font-semibold text-2xl text-center">Storacha</h1>
				<div className="py-10 flex flex-col items-center gap-5">
					<InputOTP maxLength={4} onChange={(value) => setOTP(value)}>
						<InputOTPGroup>
							<InputOTPSlot index={0} />
							<InputOTPSlot index={1} />
							<InputOTPSlot index={2} />
							<InputOTPSlot index={3} />
						</InputOTPGroup>
					</InputOTP>
				</div>
			</div>
			<div className="flex flex-col items-center gap-5">
				<CountDown handleSendPin={handleSendPin} />
				<p className="text-center text-blue-600/80">Hurry... enter the pin you received on your Telegram.</p>
			</div>
			<div className="flex justify-center items-center">
				<Button className="w-full" onClick={submitOTP} disabled={disabled}>
					{loading ? 'Loading...' : 'Submit OTP'}
				</Button>
			</div>
		</div>
	)
}

export default function TelegramAuth() {
	const [isPinSended, setIsPinSended] = useState(true)
	const [loading, setLoading] = useState(false)

	async function handleSendPin() {
		try {
			setLoading(true)
			await authTelegram()
			setIsPinSended(true)
			setLoading(false)
		} catch (error) {
			setLoading(false)
		}
	}

	if (isPinSended) {
		return <SubmitOTP handleSendPin={handleSendPin} />
	}

	return (
		<div className="pt-20 pb-10 px-5 flex flex-col items-stretch justify-between h-screen bg-primary/10">
			<div className="flex flex-col items-center gap-2">
				<h1 className="text-primary font-semibold text-2xl text-center">Storacha</h1>
				<div className="py-10 flex flex-col items-center gap-5">
					<h1 className="text-xl font-semibold">Authorization</h1>
					<p className="text-center text-blue-600/80">
						Authorise access to your Telegram chats to securely proceed with your backups. You will receive a code in
						Telegram. Please enter it in the next step to continue.
					</p>
				</div>
			</div>
			<div className="flex justify-center items-center">
				<Button className="w-full" onClick={handleSendPin} disabled={loading}>
					{loading ? 'Sending...' : 'Send Pin'}
				</Button>
			</div>
		</div>
	)
}
