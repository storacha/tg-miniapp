'use client'

import { Layouts } from '@/components/layouts'
import { useParams } from 'next/navigation'

export const runtime = 'edge'

export default function Page () {
  const params = useParams<{ id: string }>()
  console.log(params)
  return (
    <Layouts isSinglePage isBackgroundBlue>
      TODO
    </Layouts>
  )
}
