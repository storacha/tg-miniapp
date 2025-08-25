'use client'

import { useEffect, useState } from 'react'
import { useError } from '@/providers/error'
import { useGlobal } from '@/zustand/global'
import { LeaderboardUser, Ranking } from '@/api'
import { Layouts } from '@/components/layouts'
import Users from '@/components/leaderboard/users'
import { Banner } from '@/components/leaderboard/banner'
import { Podium } from '@/components/leaderboard/podium'
import { getLeaderboardWithRanking } from '@/components/server'
import { fromResult, getErrorMessage } from '@/lib/errorhandling'

export default function Page() {
  const { tgSessionString, space } = useGlobal()
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [ranking, setRanking] = useState<Ranking | undefined>()
  const { setError } = useError()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = fromResult(
          await getLeaderboardWithRanking(tgSessionString, space ?? undefined)
        )
        setLeaderboard(data.leaderboard)
        setRanking(data.ranking)
      } catch (error) {
        const title = 'Error fetching leaderboard!'
        console.error(title, error)
        setError(getErrorMessage(error), { title })
        setLeaderboard([])
        setRanking(undefined)
      }
    }

    fetchData()
  }, [tgSessionString, space])

  return (
    <Layouts isSinglePage isBackgroundBlue>
      {ranking ? <Banner {...ranking} /> : ''}
      <Podium
        firstPlace={leaderboard.length > 0 ? leaderboard[0] : undefined}
        secondPlace={leaderboard.length > 1 ? leaderboard[1] : undefined}
        thirdPlace={leaderboard.length > 2 ? leaderboard[2] : undefined}
      />
      <Users users={leaderboard} />
    </Layouts>
  )
}
