'use client'

import { Button } from '../ui/button'
import Coin from '../svgs/coin'
import { useRouter } from 'next/navigation'
import { useTelegram } from '@/providers/telegram'
import { useEffect, useState, useRef } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Ranking } from '@/api'
import { fromResult } from '@/lib/errorhandling'
import { useGlobal } from '@/zustand/global'
import { getRanking } from '../server'
import { useBackups } from '@/providers/backup'
import { useUserLocale } from '@/hooks/useUserLocale'
import { useSentryContext } from '@/hooks/useSentryContext'
import { logAndAddContext } from '@/lib/sentry'

export default function Head() {
  const router = useRouter()
  const [{ user }] = useTelegram()
  const { tgSessionString, space } = useGlobal()
  const [ranking, setRanking] = useState<Ranking | undefined>()
  const { captureError } = useSentryContext()
  const [{ backups }] = useBackups()
  const { formatNumber } = useUserLocale()
  const isLoadingRef = useRef(false)

  const fetchRanking = async () => {
    if (!space || !tgSessionString) return
    if (isLoadingRef.current) {
      console.debug('Ranking fetch already in progress, skipping')
      return // Prevent concurrent calls
    }

    isLoadingRef.current = true

    await Sentry.startSpan(
      { op: 'ranking.fetch', name: 'Fetch Ranking' },
      async () => {
        try {
          logAndAddContext('Fetching ranking...', {
            category: 'ui.head',
            level: 'info',
            data: { space, hasSession: !!tgSessionString },
          })
          const ranking = fromResult(await getRanking(tgSessionString, space))
          setRanking(ranking)
        } catch (error) {
          captureError(error, { extra: { title: 'Error fetching ranking!' } })
          setRanking(undefined)
        } finally {
          isLoadingRef.current = false
        }
      }
    )
  }

  useEffect(() => {
    fetchRanking()
    // NOTE: listen to backup.items to sync after backup changes
  }, [tgSessionString, space, backups.items])

  // Cleanup loading state on unmount
  useEffect(() => {
    return () => {
      isLoadingRef.current = false
    }
  }, [])

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
