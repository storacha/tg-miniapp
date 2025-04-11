'use client'

import { Layouts } from '@/components/layouts'
import Dates, { Period } from '@/components/backup/dates'
import Chats from '@/components/backup/chats'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Connect, Verify, ConnectError } from '@/components/backup/connect'
import { Summary } from '@/components/backup/summary'
import { useGlobal } from '@/zustand/global'
import { useW3 as useStoracha } from '@storacha/ui-react'
import { email as parseEmail } from '@storacha/did-mailto'
import { useTelegram } from '@/providers/telegram'

const spaceNamePrefix = 'Telegram Backups'

export default function Page() {
	const [step, setStep] = useState(0)
	const router = useRouter()
	const { isStrochaAuthorized, setIsStrochaAuthorized, space, setSpace } = useGlobal()
	const [chats, setChats] = useState<Set<bigint>>(new Set())
	const [period, setPeriod] = useState<Period>([0, Infinity])
	const [email, setEmail] = useState('')
	const [connErr, setConnErr] = useState<Error>()
	const [{ user }] = useTelegram()
	const [{ client }] = useStoracha()

	const handleConnectSubmit = async () => {
		try {
			if (!client) throw new Error('missing Storacha client instance')
			setStep(3)

			const spaceName = `${spaceNamePrefix} (${user?.id})`
			const account = await client.login(parseEmail(email))
			const space = client.spaces().find(s => s.name === spaceName)
			if (space) {
				setSpace(space.did())
			} else {
				await account.plan.wait()
				const space = await client.createSpace(spaceName, { account })
				setSpace(space.did())
			}
			setIsStrochaAuthorized(true)
			setStep(5)
		} catch (err: any) {
			console.error(err)
			setConnErr(err)
			setStep(4)
		}
	}

	function handleBack() {
		if (step === 0) {
			router.back()
		}
		setStep(step === 5 ? 1 : step - 1)
	}

	const handleSummarySubmit = () => {
		console.log('TODO: DO A BACKUP')
	}

	return (
		<Layouts isSinglePage back={() => handleBack()}>
			{step === 0 && <Chats selections={chats} onSelectionsChange={s => setChats(s)} onSubmit={() => setStep(1)}/>}
			{step >= 1 && step <= 3 && <Dates period={period} onPeriodChange={setPeriod} onSubmit={() => setStep(isStrochaAuthorized ? 5 : 2)} />}
			<Connect open={step === 2 && !connErr} email={email} onEmailChange={setEmail} onSubmit={handleConnectSubmit} onDismiss={() => setStep(1)} />
			<Verify open={step === 3 && !connErr} email={email} onDismiss={() => setStep(1)} />
			<ConnectError open={step === 4} error={connErr} onDismiss={() => { setConnErr(undefined); setStep(1) }} />
			{step === 5 && space && <Summary space={space} chats={chats} period={period} onSubmit={handleSummarySubmit} />}
		</Layouts>
	)
}
