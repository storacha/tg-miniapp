'use client'

import Dashboard from '@/components/dashboard'
import { Layouts } from '@/components/layouts'
import Onboarding from '@/components/onboarding'
import TelegramAuth from '@/components/telegram-auth'
import { useGlobal } from '@/zustand/global'

export default function Page() {
	const { isOnboarded, isTgAuthorized } = useGlobal()
	if (!isOnboarded) {
		return <Onboarding />
	}

	if (!isTgAuthorized) {
		return <TelegramAuth />
	}
	return (
		<Layouts>
			<Dashboard />
		</Layouts>
	)
}
