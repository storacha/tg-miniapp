'use client'

import { Layouts } from '@/components/layouts'
import { Banner } from '@/components/leaderboard/banner'
import { Podium } from '@/components/leaderboard/podium'
import Users from '@/components/leaderboard/users'

export default function Page() {
	return (
		<Layouts isSinglePage isBackgroundBlue>
			<Banner />
			<Podium />
			<Users />
		</Layouts>
	)
}
