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
import { fromResult, getErrorMessage } from '@/lib/errorhandling'
import pRetry from 'p-retry'

export default function Page() {
  const { tgSessionString, space } = useGlobal()
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [ranking, setRanking] = useState<Ranking | undefined>()
  const { setError } = useError()

  useEffect(() => {
    ;(async () => {
      try {
        await pRetry(
          async () => {
            const leaderboard = fromResult(
              await getLeaderboard(tgSessionString)
            )
            setLeaderboard(leaderboard)
          },
          {
            retries: 5,
            onFailedAttempt: (error) => {
              console.warn(
                `Failed to load leaderboard: ${error.message}. I've made ${error.attemptNumber} attempt(s), ${error.retriesLeft} retries left`
              )
            },
          }
        )
      } catch (error) {
        const title = 'Error fetching leaderboard!'
        console.error(title, error)
        setError(getErrorMessage(error), { title })
        setLeaderboard([])
      }

      if (space) {
        try {
          const ranking = fromResult(await getRanking(tgSessionString, space))
          setRanking(ranking)
        } catch (error) {
          const title = 'Error fetching ranking!'
          console.error(title, error)
          setError(getErrorMessage(error), { title })
          setRanking(undefined)
        }
      }
    })()
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
