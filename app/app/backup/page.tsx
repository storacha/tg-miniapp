'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DialogsById, Period } from '@/api'
import { useGlobal } from '@/zustand/global'
import { useBackups } from '@/providers/backup'
import Dates from '@/components/backup/dates'
import Chats from '@/components/backup/chats'
import { Layouts } from '@/components/layouts'
import { Summary } from '@/components/backup/summary'
import { StorachaConnect } from '@/components/backup/connect'
import { useAnalytics } from '@/lib/analytics'

export default function Page() {
  const router = useRouter()
  const { isStorachaAuthorized, space } = useGlobal()
  const [, { addBackupJob }] = useBackups()
  const [step, setStep] = useState(0)
  const [starting, setStarting] = useState(false)
  const [period, setPeriod] = useState<Period>([0])
  const [chats, setChats] = useState<DialogsById>({})
  const { logBackupOpened, logBackupRequested } = useAnalytics()

  useEffect(() => {
    logBackupOpened()
  }, [])

  function handleBack() {
    if (step === 0) {
      router.back()
    }
    setStep(step === 2 ? 1 : step - 1)
  }

  const handleSummarySubmit = async () => {
    if (!space) return
    setStarting(true)
    logBackupRequested()
    const id = await addBackupJob(chats, period)
    if (!id) {
      setStarting(false)
      return
    }
    console.log('backup job added with ID', id)
    router.push('/')
  }

  return (
    <Layouts isSinglePage back={() => handleBack()}>
      {step === 0 && (
        <Chats
          selections={chats}
          onSelectionsChange={(s) => setChats(s)}
          onSubmit={() => setStep(1)}
        />
      )}
      {(step === 1 || (step === 2 && (!isStorachaAuthorized || !space))) && (
        <Dates
          period={period}
          onPeriodChange={setPeriod}
          onSubmit={() => setStep(2)}
        />
      )}
      {step === 2 && !isStorachaAuthorized && (
        <StorachaConnect open={true} onDismiss={() => setStep(1)} />
      )}
      {step === 2 && isStorachaAuthorized && space && (
        <Summary
          space={space}
          chats={chats}
          period={period}
          onSubmit={handleSummarySubmit}
          starting={starting}
        />
      )}
    </Layouts>
  )
}
