'use client'

import { useState, useEffect, FormEventHandler } from 'react'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useGlobal } from '@/zustand/global'
import { TelegramClient, Api } from '@/vendor/telegram'
import { StoreSession } from '@/vendor/telegram/sessions'
import { Input } from './ui/input'

const apiId = parseInt(process.env.NEXT_PUBLIC_TELEGRAM_API_ID ?? '')
const apiHash = process.env.NEXT_PUBLIC_TELEGRAM_API_HASH ?? ''

if (isNaN(apiId)) {
	throw new Error('missing environment variable NEXT_PUBLIC_TELEGRAM_API_ID')
} else if (!apiHash) {
	throw new Error('missing environment variable NEXT_PUBLIC_TELEGRAM_API_HASH')
}

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

function OTPForm({ onCode, onResend, loading, error }: { onCode: (c: string) => unknown, onResend: () => unknown, loading: boolean, error?: Error }) {
	const [code, setCode] = useState('')

	const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
		e.preventDefault()
		onCode(code)
	}

	const disabled = code === null || code.length < 5 || loading

	return (
		<form onSubmit={handleSubmit} className="pt-20 pb-10 px-5 flex flex-col items-stretch justify-between h-screen bg-background">
			<div className="flex flex-col items-center gap-2">
				<h1 className="text-primary font-semibold text-2xl text-center">Storacha</h1>
				<div className="py-10 flex flex-col items-center gap-5">
					<InputOTP maxLength={5} onChange={(value) => setCode(value)}>
						<InputOTPGroup>
							<InputOTPSlot index={0} />
							<InputOTPSlot index={1} />
							<InputOTPSlot index={2} />
							<InputOTPSlot index={3} />
							<InputOTPSlot index={4} />
						</InputOTPGroup>
					</InputOTP>
				</div>
			</div>
			<div className="flex flex-col items-center gap-5">
				<CountDown onResend={onResend} />
				<p className="text-center text-blue-600/80">Hurry... enter the pin you received on your Telegram.</p>
			</div>
			<div className="flex justify-center items-center">
				<Button type="submit" className="w-full" disabled={disabled}>
					{loading ? 'Loading...' : 'Submit OTP'}
				</Button>
			</div>
		</form>
	)
}

export default function TelegramAuth() {
	const [phone, setPhone] = useState('')
	const [isOTPSent, setOTPSent] = useState(false)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<Error>()
	const [client, setClient] = useState<TelegramClient>()
	const [codeHash, setCodeHash] = useState<string>()
	const { setIsTgAuthorized } = useGlobal()

	const handlePhoneSubmit: FormEventHandler<HTMLFormElement> = async e => {
		e.preventDefault()
		try {
			setLoading(true)
			const session = new StoreSession('tg-session')
			const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 })
			await client.connect()
			setClient(client)

			const { phoneCodeHash } = await client.sendCode({ apiHash, apiId }, phone)
			setCodeHash(phoneCodeHash)
			setOTPSent(true)
		} catch (err) {
			console.error('requesting OTP:', err)
		} finally {
			setLoading(false)
		}
	}
	const handleCode = async (code: string) => {
		try {
			if (!client) throw new Error('missing client')

				console.log('Signing in', phone, code, codeHash)

			await client.connect()
			const result = await client.invoke(
				new Api.auth.SignIn({
					phoneNumber: phone,
					phoneCode: code,
					phoneCodeHash: codeHash,
				}),
			)
			if (result instanceof Api.auth.AuthorizationSignUpRequired) {
				throw new Error('user needs to sign up')
			}

			setIsTgAuthorized(true)
		} catch (err: any) {
			console.error('signing in:', err)
			setError(err)
		} finally {
			setLoading(false)
		}
	}

	const handleResend = async () => {
		if (!client) return
		const { phoneCodeHash } = await client.sendCode({ apiHash, apiId }, phone)
		setCodeHash(phoneCodeHash)
	}

	if (isOTPSent) {
		return <OTPForm onCode={handleCode} onResend={handleResend} loading={loading} error={error} />
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
						<Input className="bg-white" type="tel" placeholder="e.g. +12223334455" value={phone} onChange={e => setPhone(e.target.value)} required />
						<p className="text-blue-600/80 text-center text-xs my-2">Please enter your number in <a href="https://telegram.org/faq#login-and-sms" target="_blank" className='underline'>international format</a>.</p>
					</div>
				</div>
			</div>
			<div className="flex flex-col justify-center items-center">
				<p className="text-center text-blue-600/80 mb-3">
					You will receive a code in Telegram. Please enter it in the next step to continue.
				</p>
				<Button type="submit" className="w-full" disabled={loading || !phone}>
					{loading ? 'Sending...' : 'Send Pin'}
				</Button>
			</div>
		</form>
	)
}
