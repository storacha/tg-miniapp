'use client'

import { Button } from '../ui/button'
import Coin from '../svgs/coin'
import { useRouter } from 'next/navigation'
import { useTelegram } from '@/providers/telegram'
import { useEffect, useState } from 'react'
import { Ranking } from '@/api'
import { fromResult, getErrorMessage } from '@/lib/errorhandling'
import { useGlobal } from '@/zustand/global'
import { getRanking } from '../server'
import { useError } from '@/providers/error'
import { useBackups } from '@/providers/backup'

export default function Head() {
  const router = useRouter()
  const [{ user }] = useTelegram()
  const { tgSessionString, space } = useGlobal()
  const [ranking, setRanking] = useState<Ranking | undefined>()
  const { setError } = useError()
  const [{ backups }] = useBackups()

  const fetchRanking = async () => {
    if (!space) return

    try {
      const ranking = fromResult(await getRanking(tgSessionString, space))
      setRanking(ranking)
    } catch (error) {
      setError(getErrorMessage(error), { title: 'Error fetching ranking!' })
      setRanking(undefined)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchRanking()
  }, [tgSessionString, space])

  // Listen for backup changes
  useEffect(() => {
    fetchRanking()
  }, [backups.items]) // Refetch when backups change

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
                <p>{ranking ? ranking.points.toLocaleString() : '00'}</p>
              </div>
            </>
          ) : (
            ''
          )}
        </div>
      </div>
      <div className="flex justify-between items-center px-3 pb-4">
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
