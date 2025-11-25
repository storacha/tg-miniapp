'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useW3 as useStoracha } from '@storacha/ui-react'
import { XIcon } from 'lucide-react'
import { DialogsById, Period } from '@/api'
import { useGlobal } from '@/zustand/global'
import { useBackups } from '@/providers/backup'
import Dates from '@/components/backup/dates'
import Chats from '@/components/backup/chats'
import { Layouts } from '@/components/layouts'
import { Summary } from '@/components/backup/summary'
import { StorachaConnect } from '@/components/backup/connect'
import { useAnalytics } from '@/lib/analytics'
import { logAndAddContext } from '@/lib/sentry'
import { PricingTable } from '@/components/pricing-table'
import { MAX_FREE_BYTES } from '@/lib/server/constants'
import { formatBytes } from '@/lib/utils'
import { isStorageLimitExceeded } from '@/lib/storacha'

export default function Page() {
  const router = useRouter()
  const [{ client }] = useStoracha()
  const { isStorachaAuthorized, space } = useGlobal()
  const [, { addBackupJob }] = useBackups()
  const [step, setStep] = useState(0)
  const [starting, setStarting] = useState(false)
  const [period, setPeriod] = useState<Period>([0])
  const [chats, setChats] = useState<DialogsById>({})
  const { logBackupOpened, logBackupRequested } = useAnalytics()

  useEffect(() => {
    logBackupOpened()
    logAndAddContext('Backup page load', {
      category: 'ui.backup',
      level: 'info',
      data: { space },
    })
  }, [])

  function handleBack() {
    if (step === 0) {
      router.back()
    }
    setStep(step === 2 ? 1 : step - 1)
  }

  const [showPlans, setShowPlans] = useState(false)
  const [latestStorageUsed, setLatestStorageUsed] = useState<
    number | undefined
  >()

  const handleSummarySubmit = async (storageUsed?: number) => {
    if (!space) return

    // If we already exceed the free tier, show pricing UI instead of starting
    if (storageUsed && (await isStorageLimitExceeded(client!, storageUsed))) {
      setLatestStorageUsed(storageUsed)
      setShowPlans(true)
      return
    }

    setStarting(true)
    logBackupRequested()
    const id = await addBackupJob(chats, period)
    if (!id) {
      setStarting(false)
      logAndAddContext('Backup job failed to start', {
        category: 'ui.backup',
        level: 'error',
      })
      return
    }
    logAndAddContext('Backup job added', {
      category: 'ui.backup',
      level: 'info',
      data: { id },
    })
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
      {step === 1 && (
        <>
          <Dates onPeriodChange={setPeriod} onSubmit={() => setStep(2)} />
          {!isStorachaAuthorized && (
            <StorachaConnect open={true} onDismiss={() => setStep(0)} />
          )}
        </>
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
      {showPlans && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4"
          onClick={() => setShowPlans(false)}
        >
          <div
            className="bg-red-50 rounded-xl w-full max-w-3xl relative max-h-[80vh] overflow-hidden border border-red-600"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative top-0 z-30 bg-red-50/95 backdrop-blur-sm border-b border-red-200 px-6 py-3">
              <h2 className="text-lg font-semibold text-center">
                Upgrade plan
              </h2>
              <div className="ml-4 flex-shrink-0">
                <button
                  aria-label="Close pricing"
                  className="absolute top-3 right-3 p-1"
                  onClick={() => setShowPlans(false)}
                >
                  <XIcon size={22} color="#111827" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-72px)]">
              <p className="text-sm mb-4 text-muted-foreground text-center">
                {latestStorageUsed ? (
                  <>
                    You have used {formatBytes(latestStorageUsed)} of{' '}
                    {formatBytes(MAX_FREE_BYTES)} free storage
                  </>
                ) : (
                  <>
                    You have used more than the {formatBytes(MAX_FREE_BYTES)}{' '}
                    free storage
                  </>
                )}
              </p>
              <PricingTable />
            </div>
          </div>
        </div>
      )}
    </Layouts>
  )
}
