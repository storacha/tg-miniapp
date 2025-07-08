'use client'

import { useState, useEffect, FormEventHandler } from 'react'
import { Button } from '@/components/ui/button'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { useGlobal } from '@/zustand/global'
import { Api, TelegramClient } from '@/vendor/telegram'
import { computeCheck } from '@/vendor/telegram/Password'
import { Input } from './ui/input'
import { useTelegram } from '@/providers/telegram'
import { StringSession } from '@/vendor/telegram/sessions'
import { TelegramClientParams } from '@/vendor/telegram/client/telegramBaseClient'
import { getErrorMessage } from '@/lib/errorhandling'
import { useAnalytics } from '@/lib/analytics'

const apiId = parseInt(process.env.NEXT_PUBLIC_TELEGRAM_API_ID ?? '')
const apiHash = process.env.NEXT_PUBLIC_TELEGRAM_API_HASH ?? ''
const appVersion = process.env.version ?? '1.0.0'
const defaultClientParams: TelegramClientParams = {
  connectionRetries: 5,
  deviceModel: 'Storacha',
  systemVersion: 'Linux',
  appVersion,
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

  return (
    <p className="text-xl font-semibold">
      00:{count.toString().padStart(2, '0')}
    </p>
  )
}

function OTPForm({
  onSubmit,
  onCodeChange,
  onResend,
  onBack,
  code,
  loading,
  error,
}: {
  onSubmit: () => unknown
  onCodeChange: (code: string) => unknown
  onResend: () => unknown
  onBack: () => unknown
  code: string
  loading: boolean
  error?: Error
}) {
  const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    onSubmit()
  }

  const disabled = code === null || code.length < 5 || loading

  return (
    <form
      onSubmit={handleSubmit}
      className="pt-20 pb-10 px-5 flex flex-col items-stretch justify-between h-screen bg-background"
    >
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-primary font-semibold text-2xl text-center">
          Storacha
        </h1>
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
          {error && (
            <p className="text-red-600 text-center text-xs my-2">
              {error.message}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-5">
        <CountDown onResend={onResend} />
        <p className="text-center text-blue-600/80">
          Hurry... enter the pin you received on your Telegram.
        </p>
      </div>
      <div className="flex flex-col justify-center items-center gap-3">
        {disabled ? (
          <Button
            type="submit"
            className="w-full"
            onClick={onBack}
            disabled={loading}
          >
            Back
          </Button>
        ) : (
          <Button type="submit" className="w-full" disabled={disabled}>
            {loading ? 'Loading...' : 'Submit OTP'}
          </Button>
        )}
      </div>
    </form>
  )
}

function TwoFAForm({
  onSubmit,
  onPasswordChange,
  password,
  hint,
  loading,
  error,
}: {
  onSubmit: () => unknown
  onPasswordChange: (p: string) => unknown
  password: string
  hint?: string
  loading: boolean
  error?: Error
}) {
  const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="pt-20 pb-10 px-5 flex flex-col items-stretch justify-between h-screen bg-background"
    >
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-primary font-semibold text-2xl text-center">
          Storacha
        </h1>
        <div className="py-10 flex flex-col items-center gap-5">
          <p className="text-center text-blue-600/80">
            Two-factor authentication is enabled on your account. Please enter
            your password.
          </p>
          <Input
            type="password"
            onChange={(e) => onPasswordChange(e.target.value)}
            value={password}
          />
          {hint && !error && <p className="text-sm">Hint: {hint}</p>}
          {error && (
            <p className="text-red-600 text-center text-xs my-2">
              {error.message}
            </p>
          )}
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
  const { logTelegramLoginStarted, logTelegramLoginSuccess } = useAnalytics()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error>()
  const [codeHash, setCodeHash] = useState('')
  const [code, setCode] = useState('')
  const { phoneNumber, setPhoneNumber, tgSessionString, setTgSessionString } =
    useGlobal()
  const [{ user }, { setIsTgAuthorized }] = useTelegram()
  const [is2FARequired, set2FARequired] = useState(false)
  const [password, setPassword] = useState('')
  const [srp, setSRP] = useState<Api.account.Password>()
  const [client, setClient] = useState<TelegramClient>()

  useEffect(() => {
    const newClient = new TelegramClient(
      new StringSession(tgSessionString),
      apiId,
      apiHash,
      defaultClientParams
    )
    setClient(newClient)
  }, [tgSessionString])

  if (!client) return

  const handlePhoneSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(undefined)
      logTelegramLoginStarted()

      if (!client.connected) {
        await client.connect()
      }
      const { phoneCodeHash } = await client.sendCode(client, phoneNumber)
      setCodeHash(phoneCodeHash)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('requesting OTP:', err)
      const errorMsg = getErrorMessage(err)
      if (errorMsg.includes('PHONE_NUMBER_INVALID')) {
        setError(new Error('Your phone number is incorrect. Please try again.'))
      } else {
        setError(err)
      }
    } finally {
      setLoading(false)
    }
  }

  const getSRP = async () => {
    try {
      const srp = await client.invoke(new Api.account.GetPassword())
      setSRP(srp)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err)
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
        })
      )
      if (result instanceof Api.auth.AuthorizationSignUpRequired) {
        throw new Error('user needs to sign up')
      }
      if (process.env.NODE_ENV === 'production') {
        if (BigInt(result.user.id.toString()) !== BigInt(user?.id ?? 0)) {
          throw new Error('login user and user using the app must match')
        }
      }
      setTgSessionString(client.session)
      setIsTgAuthorized(true)
      logTelegramLoginSuccess()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.log('signing in:', err)
      const errorMsg = getErrorMessage(err)
      if (errorMsg.includes('SESSION_PASSWORD_NEEDED')) {
        await getSRP()
        set2FARequired(true)
        return
      } else if (errorMsg.includes('PHONE_CODE_INVALID')) {
        setError(
          new Error('The code you entered is incorrect. Please try again.')
        )
        return
      }
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

  const handle2FAPasswordSubmit = async () => {
    try {
      setLoading(true)
      setError(undefined)

      if (!srp) {
        throw new Error('missing secure remote password')
      }

      if (!client.connected) {
        await client.connect()
      }
      const result = await client.invoke(
        new Api.auth.CheckPassword({
          password: await computeCheck(srp, password),
        })
      )
      if (result instanceof Api.auth.AuthorizationSignUpRequired) {
        throw new Error('user needs to sign up')
      }
      if (process.env.NODE_ENV === 'production') {
        if (BigInt(result.user.id.toString()) !== BigInt(user?.id ?? 0)) {
          throw new Error('login user and user using the app must match')
        }
      }
      setTgSessionString(client.session)
      setIsTgAuthorized(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('checking password:', err)
      await getSRP()
      const errorMsg = getErrorMessage(err)
      if (errorMsg.includes('PASSWORD_HASH_INVALID')) {
        setError(new Error('Your password was incorrect. Please try again.'))
      } else {
        setError(err)
      }
    } finally {
      setLoading(false)
    }
  }

  if (is2FARequired) {
    return (
      <TwoFAForm
        password={password}
        hint={srp?.hint}
        onPasswordChange={(p) => {
          setError(undefined)
          setPassword(p)
        }}
        onSubmit={handle2FAPasswordSubmit}
        loading={loading}
        error={error}
      />
    )
  }

  if (codeHash) {
    return (
      <OTPForm
        code={code}
        onCodeChange={(c) => {
          setError(undefined)
          setCode(c)
        }}
        onSubmit={handleCodeSubmit}
        onResend={handleResend}
        onBack={() => {
          setCodeHash('')
          setError(undefined)
          setCode('')
        }}
        loading={loading}
        error={error}
      />
    )
  }

  return (
    <form
      className="pt-20 pb-10 px-5 flex flex-col items-stretch justify-between h-screen bg-primary/10"
      onSubmit={handlePhoneSubmit}
    >
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-primary font-semibold text-2xl text-center">
          Storacha
        </h1>
        <div className="py-10 flex flex-col items-center gap-5">
          <h1 className="text-xl font-semibold">Authorization</h1>
          <p className="text-center text-blue-600/80">
            Authorize access to your Telegram chats to securely proceed with
            your backups.
          </p>
          <div className="w-full">
            <p className="text-blue-600/80 text-center my-2">
              Your phone number:
            </p>
            <Input
              className="bg-white"
              type="tel"
              placeholder="e.g. +12223334455"
              value={phoneNumber}
              onChange={(e) => {
                setError(undefined)
                setPhoneNumber(e.target.value)
              }}
              required
            />
            {error ? (
              <p className="text-red-600 text-center text-xs my-2">
                {error.message}
              </p>
            ) : (
              <p className="text-blue-600/80 text-center text-xs my-2">
                Please enter your number in{' '}
                <a
                  href="https://telegram.org/faq#login-and-sms"
                  target="_blank"
                  className="underline"
                >
                  international format
                </a>
                .
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-center items-center">
        <p className="text-center text-blue-600/80 mb-3">
          You will receive a code in Telegram. Please enter it in the next step
          to continue.
        </p>
        <Button
          type="submit"
          className="w-full"
          disabled={loading || !phoneNumber}
        >
          {loading ? 'Sending...' : 'Send Pin'}
        </Button>
      </div>
    </form>
  )
}
