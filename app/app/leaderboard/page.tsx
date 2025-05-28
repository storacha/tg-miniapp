'use client'

import { LeaderboardUser, Ranking } from '@/api'
import { Layouts } from '@/components/layouts'
import { Banner } from '@/components/leaderboard/banner'
import { Podium } from '@/components/leaderboard/podium'
import Users from '@/components/leaderboard/users'
import { getLeaderboard, getRanking } from '@/components/server'
import { fromResult } from '@/lib/errorhandling'
import { useGlobal } from '@/zustand/global'
import { useEffect, useState } from 'react'

export default function Page() {
	const { tgSessionString, space } = useGlobal()
	const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
	const [ranking, setRanking] = useState<Ranking | undefined>()
	useEffect(() => {
		if (!space) {
			return
		}
		(async () => {
			setLeaderboard(fromResult(await getLeaderboard(tgSessionString)))
			setRanking(fromResult(await getRanking(tgSessionString, space)))
		})()
	}, [tgSessionString, space])
	return (
		<Layouts isSinglePage isBackgroundBlue>
			{ranking ? <Banner {...ranking}/> : ''} 
			<Podium 
				firstPlace={leaderboard.length > 0 ? leaderboard[0] : undefined}
				secondPlace={leaderboard.length > 1 ? leaderboard[1] : undefined}
				thirdPlace={leaderboard.length > 2 ? leaderboard[2] : undefined}
			/>
			<Users users={leaderboard} />
		</Layouts>
	)
}
