'use client'

import { Layouts } from '@/components/layouts'
import Dates from '@/components/backup/dates'
import Chats from '@/components/backup/chats'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Connect, Verify, ConnectError } from '@/components/backup/connect'
import { Summary } from '@/components/backup/summary'
import { useGlobal } from '@/zustand/global'
import { useW3 as useStoracha } from '@storacha/ui-react'
import { email as parseEmail } from '@storacha/did-mailto'
import { useTelegram } from '@/providers/telegram'
import { Period } from '@/api'
import { useBackups } from '@/providers/backup'

const spaceNamePrefix = 'Telegram Backups'

export default function Page() {
	const [step, setStep] = useState(0)
	const router = useRouter()
	const { isStorachaAuthorized, setIsStorachaAuthorized, space, setSpace } = useGlobal()
	const [chats, setChats] = useState<Set<bigint>>(new Set())
	const [period, setPeriod] = useState<Period>([0])
	const [email, setEmail] = useState('')
	const [connErr, setConnErr] = useState<Error>()
	const [{ user }] = useTelegram()
	const [{ client }] = useStoracha()
	const [, { addBackupJob }] = useBackups()
	const [starting, setStarting] = useState(false)

	const handleConnectSubmit = async () => {
		try {
			if (!client) throw new Error('missing Storacha client instance')
			setStep(3)

			const spaceName = `${spaceNamePrefix} (${user?.id})`
			const account = await client.login(parseEmail(email))
			const space = client.spaces().find(s => s.name === spaceName)
			if (space) {
				await client.setCurrentSpace(space.did())
				setSpace(space.did())
			} else {
				await account.plan.wait()
				const space = await client.createSpace(spaceName, { account })
				await client.setCurrentSpace(space.did())
				setSpace(space.did())
			}
			setIsStorachaAuthorized(true)
			setStep(5)
		} catch (err) {
			console.error(err)
			setConnErr(err as Error)
			setStep(4)
		}
	}

	function handleBack() {
		if (step === 0) {
			router.back()
		}
		setStep(step === 5 ? 1 : step - 1)
	}

	const handleSummarySubmit = async () => {
		if (!space) return
  		setStarting(true)
		const id = await addBackupJob(chats, period)
		if (!id) {
			setStarting(false)
			return
		}
		console.log('backup job added with ID', id)
		router.push('/')
	}

	return (
		<Layouts isSinglePage back={() => handleBack()}>
			{step === 0 && <Chats selections={chats} onSelectionsChange={s => setChats(s)} onSubmit={() => setStep(1)}/>}
			{step >= 1 && step <= 3 && <Dates period={period} onPeriodChange={setPeriod} onSubmit={() => setStep(isStorachaAuthorized ? 5 : 2)} />}
			<Connect open={step === 2 && !connErr} email={email} onEmailChange={setEmail} onSubmit={handleConnectSubmit} onDismiss={() => setStep(1)} />
			<Verify open={step === 3 && !connErr} email={email} onDismiss={() => setStep(1)} />
			<ConnectError open={step === 4} error={connErr} onDismiss={() => { setConnErr(undefined); setStep(1) }} />
			{step === 5 && space && <Summary space={space} chats={chats} period={period} onSubmit={handleSummarySubmit} starting={starting} />}
		</Layouts>
	)
}
