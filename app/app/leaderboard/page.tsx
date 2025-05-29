'use client'

import { useEffect, useState } from 'react'
import { useError } from '@/providers/error'
import { useGlobal } from '@/zustand/global'
import { LeaderboardUser, Ranking } from '@/api'
import { Layouts } from '@/components/layouts'
import Users from '@/components/leaderboard/users'
import { Banner } from '@/components/leaderboard/banner'
import { Podium } from '@/components/leaderboard/podium'
import { getLeaderboard, getRanking } from '@/components/server'
import { parseResult } from '@/lib/errorhandling'

export default function Page() {
	const { tgSessionString, space } = useGlobal()
	const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
	const [ranking, setRanking] = useState<Ranking | undefined>()
	const { setError } = useError()
	
	useEffect(() => {
		if (!space) return
		;(async () => {
			const leaderboardRes = parseResult(await getLeaderboard(tgSessionString))
			const rankingRes = parseResult(await getRanking(tgSessionString, space))
			
			if (leaderboardRes.error) {
				setError(leaderboardRes.error)
				setLeaderboard([])
      			return
			}
			setLeaderboard(leaderboardRes.ok || [])
		
			if (rankingRes.error) {
				setError(rankingRes.error)
				setRanking(undefined)
			} else {
				setRanking(rankingRes.ok)
			}
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
