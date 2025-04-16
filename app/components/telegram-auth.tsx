'use client'

import { useState, useEffect, FormEventHandler } from 'react'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useGlobal } from '@/zustand/global'
import { Api } from '@/vendor/telegram'
import { Input } from './ui/input'
import { useTelegram } from '@/providers/telegram'

function CountDown({ onResend }: { onResend: () => unknown }) {
	const [count, setCount] = useState(59)
	const [resend, setResend] = useState(false)

	function handleResend() {
		onResend()
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

function OTPForm({ onSubmit, onCodeChange, onResend, code, loading, error }: { onSubmit: () => unknown, onCodeChange: (code: string) => unknown, onResend: () => unknown, code: string, loading: boolean, error?: Error }) {
	const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
		e.preventDefault()
		onSubmit()
	}

	const disabled = code === null || code.length < 5 || loading

	return (
		<form onSubmit={handleSubmit} className="pt-20 pb-10 px-5 flex flex-col items-stretch justify-between h-screen bg-background">
			<div className="flex flex-col items-center gap-2">
				<h1 className="text-primary font-semibold text-2xl text-center">Storacha</h1>
				<div className="py-10 flex flex-col items-center gap-5">
					<InputOTP maxLength={5} onChange={(value) => onCodeChange(value)}>
						<InputOTPGroup>
							<InputOTPSlot index={0} />
							<InputOTPSlot index={1} />
							<InputOTPSlot index={2} />
							<InputOTPSlot index={3} />
							<InputOTPSlot index={4} />
						</InputOTPGroup>
					</InputOTP>
					{error && <p className="text-red-600 text-center text-xs my-2">{error.message}</p>}
				</div>
			</div>
			<div className="flex flex-col items-center gap-5">
				<CountDown onResend={onResend} />
				<p className="text-center text-blue-600/80">Hurry... enter the pin you received on your Telegram.</p>
			</div>
			<div className="flex justify-center items-center">
				<Button type="submit" className="w-full" disabled={disabled}>
					{loading ? 'Loading...' : 'Submit Pin'}
				</Button>
			</div>
		</form>
	)
}

export default function TelegramAuth() {
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<Error>()
	const [codeHash, setCodeHash] = useState('')
	const [code, setCode] = useState('')
	const { setIsTgAuthorized, phoneNumber, setPhoneNumber } = useGlobal()
	const [{ client, user }] = useTelegram()

	const handlePhoneSubmit: FormEventHandler<HTMLFormElement> = async e => {
		e.preventDefault()
		try {
			setLoading(true)
			setError(undefined)

			if (!client.connected) {
				await client.connect()
			}
			const { phoneCodeHash } = await client.sendCode(client, phoneNumber)
			setCodeHash(phoneCodeHash)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: any) {
			console.error('requesting OTP:', err)
			setError(err)
		} finally {
			setLoading(false)
		}
	}
	const handleCodeSubmit = async () => {
		try {
			setLoading(true)
			setError(undefined)

			if (!client.connected) {
				await client.connect()
			}
			const result = await client.invoke(
				new Api.auth.SignIn({
					phoneNumber,
					phoneCode: code,
					phoneCodeHash: codeHash,
				}),
			)
			if (result instanceof Api.auth.AuthorizationSignUpRequired) {
				throw new Error('user needs to sign up')
			}
			if (result.user.id.value !== BigInt(user?.id ?? 0)) {
				throw new Error('login user and user using the app must match')
			}

			setIsTgAuthorized(true)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: any) {
			console.error('signing in:', err)
			setError(err)
		} finally {
			setLoading(false)
		}
	}

	const handleResend = async () => {
		const { phoneCodeHash } = await client.sendCode(client, phoneNumber)
		setCodeHash(phoneCodeHash)
	}

	if (codeHash) {
		return <OTPForm code={code} onCodeChange={c => { setError(undefined); setCode(c) }} onSubmit={handleCodeSubmit} onResend={handleResend} loading={loading} error={error} />
	}

	return (
		<form className="pt-20 pb-10 px-5 flex flex-col items-stretch justify-between h-screen bg-primary/10" onSubmit={handlePhoneSubmit}>
			<div className="flex flex-col items-center gap-2">
				<h1 className="text-primary font-semibold text-2xl text-center">Storacha</h1>
				<div className="py-10 flex flex-col items-center gap-5">
					<h1 className="text-xl font-semibold">Authorization</h1>
					<p className="text-center text-blue-600/80">
						Authorise access to your Telegram chats to securely proceed with your backups.
					</p>
					<div className="w-full">
						<p className="text-blue-600/80 text-center my-2">
							Your phone number:
						</p>
						<Input className="bg-white" type="tel" placeholder="e.g. +12223334455" value={phoneNumber} onChange={e => { setError(undefined); setPhoneNumber(e.target.value) }} required />
						{error ? (
							<p className="text-red-600 text-center text-xs my-2">{error.message}</p> 
						) : (
							<p className="text-blue-600/80 text-center text-xs my-2">Please enter your number in <a href="https://telegram.org/faq#login-and-sms" target="_blank" className='underline'>international format</a>.</p>
						)}
					</div>
				</div>
			</div>
			<div className="flex flex-col justify-center items-center">
				<p className="text-center text-blue-600/80 mb-3">
					You will receive a code in Telegram. Please enter it in the next step to continue.
				</p>
				<Button type="submit" className="w-full" disabled={loading || !phoneNumber}>
					{loading ? 'Sending...' : 'Send Pin'}
				</Button>
			</div>
		</form>
	)
}
