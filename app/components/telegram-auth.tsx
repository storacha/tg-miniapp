'use client'

import { useState, useEffect, FormEventHandler } from 'react'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useGlobal } from '@/zustand/global'
import { Api } from '@/vendor/telegram'
import { computeCheck } from '@/vendor/telegram/Password'
import { Input } from './ui/input'
import { useTelegram } from '@/providers/telegram'
import * as TelegramProxy from '@/lib/server/telegram-proxy'
import { fromResultFn } from '@/lib/utils'


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

	return <p className="text-xl font-semibold">00:{count.toString().padStart(2, '0')}</p>
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
					{loading ? 'Loading...' : 'Submit OTP'}
				</Button>
			</div>
		</form>
	)
}

function TwoFAForm({ onSubmit, onPasswordChange, password, hint, loading, error }: { onSubmit: () => unknown, onPasswordChange: (p: string) => unknown, password: string, hint?: string, loading: boolean, error?: Error }) {
	const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
		e.preventDefault()
		onSubmit()
	}

	return (
		<form onSubmit={handleSubmit} className="pt-20 pb-10 px-5 flex flex-col items-stretch justify-between h-screen bg-background">
			<div className="flex flex-col items-center gap-2">
				<h1 className="text-primary font-semibold text-2xl text-center">Storacha</h1>
				<div className="py-10 flex flex-col items-center gap-5">
					<p className="text-center text-blue-600/80">Two-factor authentication is enabled on your account. Please enter your password.</p>
					<Input type="password" onChange={e => onPasswordChange(e.target.value)} value={password} />
					{hint && !error && <p className='text-sm'>Hint: {hint}</p>}
					{error && <p className="text-red-600 text-center text-xs my-2">{error.message}</p>}
				</div>
			</div>
			<div className="flex justify-center items-center">
				<Button type="submit" className="w-full" disabled={!password}>
					{loading ? 'Loading...' : 'Submit'}
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
	const [{ initData }, { recordSession }] = useTelegram()
	const [is2FARequired, set2FARequired] = useState(false)
	const [password, setPassword] = useState('')
	const [srp, setSRP] = useState<Api.account.Password>()
	const handlePhoneSubmit: FormEventHandler<HTMLFormElement> = async e => {
		e.preventDefault()
		try {
			setLoading(true)
			setError(undefined)

			
			const { phoneCodeHash } = await fromResultFn(TelegramProxy.sendCode, { initData, phoneNumber })
			setCodeHash(phoneCodeHash)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err) {
			if (err instanceof Api.RpcError) {
				err = new Error(err.errorMessage)
			}
			if (err instanceof Error) {
				console.error('requesting OTP:', err)
				setError(err)
			} else {
				// throw unrecognized error types
				throw err
			}
		} finally {
			setLoading(false)
		}
	}

	const getSRP = async () => {
		try {
			const srp = await fromResultFn(TelegramProxy.getPassword, { initData })
			setSRP(new Api.account.Password(srp))
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: any) {
			setError(err)
		}
	}

	const handleCodeSubmit = async () => {
		try {
			setLoading(true)
			setError(undefined)

			const result = await fromResultFn(TelegramProxy.signIn, { 
					initData,
					phoneNumber,
					phoneCode: code,
					phoneCodeHash: codeHash,
			})
			await recordSession(result.session)
			setIsTgAuthorized(true)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: unknown) {
			if (err instanceof Api.RpcError) {
				if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
				 	await getSRP()
				 	set2FARequired(true)
				 	return
			 	}
				err = new Error(err.errorMessage)
			}
			if (err instanceof Error) {
				console.error('signing in:', err)
				setError(err)
			} else {
				// throw unrecognized error types
				throw err
			}
		} finally {
			setLoading(false)
		}
	}

	const handleResend = async () => {
		const { phoneCodeHash } = await fromResultFn(TelegramProxy.sendCode, { initData, phoneNumber })
		setCodeHash(phoneCodeHash)
	}

	const handle2FAPasswordSubmit = async () => {
		try {
			setLoading(true)
			setError(undefined)

			if (!srp) {
				throw new Error('missing secure remote password')
			}
			const passwordCheck = await computeCheck(srp, password)
			const result = await fromResultFn(TelegramProxy.checkPassword, {
				initData,
				password: {
					A: new Uint8Array(passwordCheck.A.buffer),
					srpId: passwordCheck.srpId.toString(),
					M1: new Uint8Array(passwordCheck.M1.buffer),
				}
			})
			await recordSession(result.session)
			setIsTgAuthorized(true)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: any) {
			if (err instanceof Api.RpcError) {
				err = new Error(err.errorMessage)
			}
			if (err instanceof Error) {
				console.error('checking password:', err)
				await getSRP()
				setError(err)
			} else {
				// throw unrecognized error types
				throw err
			}
		} finally {
			setLoading(false)
		}
	}

	if (is2FARequired) {
		return <TwoFAForm password={password} hint={srp?.hint} onPasswordChange={p => { setError(undefined); setPassword(p) }} onSubmit={handle2FAPasswordSubmit} loading={loading} error={error} />
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
