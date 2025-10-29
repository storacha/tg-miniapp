'use client'

import { useEffect } from 'react'
import { logAndAddContext } from '@/lib/sentry'
import { useGlobal } from '@/zustand/global'
import { Layouts } from '@/components/layouts'
import Users from '@/components/leaderboard/users'
import { Banner } from '@/components/leaderboard/banner'
import { Podium } from '@/components/leaderboard/podium'
import { useLeaderboard } from '@/hooks/useLeaderboard'

export default function Page() {
  const { space, user } = useGlobal()
  const { data, isLoading, error } = useLeaderboard()

  useEffect(() => {
    logAndAddContext('Leaderboard page load', {
      category: 'ui.leaderboard',
      level: 'info',
      data: { space, userId: user?.id, accountDID: user?.accountDID },
    })
  }, [space, user])

  if (error) {
    return (
      <Layouts isSinglePage isBackgroundBlue>
        <div className="text-center p-4">
          <p className="text-red-500">
            Error loading leaderboard: {error.message}
          </p>
        </div>
      </Layouts>
    )
  }

  if (isLoading) {
    return (
      <Layouts isSinglePage isBackgroundBlue>
        <div className="text-center p-4">
          <p>Loading leaderboard...</p>
        </div>
      </Layouts>
    )
  }

  const leaderboard = data?.leaderboard || []
  const ranking = data?.ranking

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
