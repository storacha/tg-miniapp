'use client'

import { Button } from '../ui/button'
import Coin from '../svgs/coin'
import { useRouter } from 'next/navigation'
import { useTelegram } from '@/providers/telegram'
import { useUserLocale } from '@/hooks/useUserLocale'
import { useSentryContext } from '@/hooks/useSentryContext'
import { useRanking } from '@/hooks/useRanking'

export default function Head() {
  const router = useRouter()
  const [{ user }] = useTelegram()
  const { formatNumber } = useUserLocale()
  const { captureError } = useSentryContext()
  const { data: ranking, error } = useRanking()

  if (error) {
    captureError(error, { extra: { title: 'Error fetching ranking!' } })
  }

  const formatPoints = (points?: number) => {
    if (!points) return '00'
    return formatNumber(points)
  }

  return (
    <div className="bg-background rounded-sm">
      <div className="flex justify-between items-center px-5 py-3">
        <p>Hi, {user?.firstName ?? ''}</p>
        <div className="flex items-center gap-10 text-blue-600">
          {ranking ? (
            <>
              <p>#{ranking.rank}</p>
              <div className="flex justify-center items-center gap-1">
                <Coin size={25} />
                <p>{formatPoints(ranking?.points)}</p>
              </div>
            </>
          ) : (
            ''
          )}
        </div>
      </div>
      <div className="flex justify-between items-center px-4 pb-4">
        <Button
          className="w-full bg-blue-500 hover:bg-blue-600"
          onClick={() => router.push('/leaderboard')}
        >
          Leaderboard
        </Button>
      </div>
    </div>
  )
}
