'use client'

import { Layouts } from '@/components/layouts'
import { Banner } from '@/components/leaderboard/banner'
import { Podium } from '@/components/leaderboard/podium'
import Users from '@/components/leaderboard/users'
import { useParams } from 'next/navigation'

export default function Page () {
  const params = useParams<{ id: string }>()
  console.log(params)
  return (
    <Layouts isSinglePage isBackgroundBlue>
      TODO
    </Layouts>
  )
}
