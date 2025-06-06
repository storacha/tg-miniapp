'use client'

import { useSignal, initData } from '@telegram-apps/sdk-react'

export default function InitDataPage() {
  const initDataRaw = useSignal(initData.raw)
  const initDataState = useSignal(initData.state)

  return (
    <div>
      <h1>initData</h1>
      <p>initData.raw: {JSON.stringify(initDataRaw)}</p>
      <p>initData.state: {JSON.stringify(initDataState)}</p>
    </div>
  )
}
