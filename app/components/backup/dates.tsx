import { useEffect, useState, FormEventHandler, useMemo } from 'react'
import { useW3 as useStoracha } from '@storacha/ui-react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  MAX_BACKUP_WEEKS_FREE_TIER,
  MAX_BACKUP_WEEKS_PAID_TIER,
} from '@/lib/server/constants'
import { isPayingAccount } from '@/lib/storacha'
import { cn } from '@/lib/utils'
import { Period } from '@/api'
export interface DatesProps {
  period: Period
  onPeriodChange: (period: Period) => unknown
  onSubmit: () => unknown
}

const MILLISECONDS_IN_A_WEEK = 7 * 24 * 60 * 60 * 1000

export default function Dates({
  period,
  onPeriodChange,
  onSubmit,
}: DatesProps) {
  const now = new Date()
  const [{ accounts, client }] = useStoracha()
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState<boolean | null>(null)

  const [dates, setDates] = useState<[Date | null, Date | null]>([
    // converting from seconds to milliseconds hence
    // multiplying by 1000 since Date() expects ms
    period[0] ? new Date(period[0] * 1000) : null, // from
    period[1] ? new Date(period[1] * 1000) : now, // to
  ])

  const accountDid = accounts[0]?.did()
  const [fromDate, toDate] = dates
  const maxWeeks = paying
    ? MAX_BACKUP_WEEKS_PAID_TIER
    : MAX_BACKUP_WEEKS_FREE_TIER

  useEffect(() => {
    let mounted = true

    const checkPaymentStatus = async () => {
      try {
        if (!client || !accountDid) return
        const result = await isPayingAccount(client, accountDid)
        if (mounted) setPaying(result)
      } catch (err) {
        console.error('Failed to check payment status', err)
        if (mounted) setPaying(false)
      }
    }

    checkPaymentStatus()
    return () => {
      mounted = false
    }
  }, [client, accountDid])

  // Normalize dates to proper time boundaries
  const normalizeDates = useMemo(
    () => (from: Date | null, to: Date | null) => {
      if (!from) return [from, to]

      const normalizedFrom = new Date(from)
      normalizedFrom.setHours(0, 0, 0, 0)

      const actualTo = to || now
      const isToday = actualTo.toDateString() === now.toDateString()

      const normalizedTo = isToday
        ? now
        : new Date(
            actualTo.getFullYear(),
            actualTo.getMonth(),
            actualTo.getDate(),
            23,
            59,
            59,
            999
          )

      return [normalizedFrom, normalizedTo]
    },
    [now]
  )

  const validateDateRange = useMemo(
    () =>
      (from: Date | null, to: Date | null): string | null => {
        if (!from || !to) return null

        if (from > to) return 'Start date cannot be after end date.'
        if (to > now) return 'End date cannot be in the future.'

        const durationMs = to.getTime() - from.getTime()
        const maxDurationMs = maxWeeks * MILLISECONDS_IN_A_WEEK

        if (durationMs > maxDurationMs) {
          return `Date range cannot exceed ${maxWeeks} weeks.`
        }

        return null
      },
    [now, maxWeeks]
  )

  useEffect(() => {
    const [normalizedFrom, normalizedTo] = normalizeDates(fromDate, toDate)
    const validationError = validateDateRange(normalizedFrom, normalizedTo)

    if (validationError) {
      setError(validationError)
    } else if (normalizedFrom && normalizedTo) {
      setError(null)
      const from = Math.floor(normalizedFrom.getTime() / 1000)
      const to = Math.floor(normalizedTo.getTime() / 1000)
      onPeriodChange([from, to])
    } else {
      setError(null)
    }
  }, [fromDate, toDate, onPeriodChange])

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault()
    if (!fromDate || !toDate || fromDate > toDate) return
    onSubmit()
  }

  const updateDate = (index: number) => (selectedDate: Date) => {
    const updated: [Date | null, Date | null] = [...dates]
    updated[index] = selectedDate
    setDates(updated)
  }

  if (paying === null) {
    return (
      <div className="p-6 text-sm text-muted-foreground text-center">
        Checking your plan...
      </div>
    )
  }

  const isSubmitDisabled = !fromDate || !toDate || !!error

  return (
    <form onSubmit={handleSubmit}>
      <div className="w-full pt-5 px-5 flex flex-col text-center justify-center gap-2 pb-10 border-b border-primary/10">
        <h1 className="text-xl font-semibold text-foreground text-center">
          Backup Chats
        </h1>
        <p className="text-sm">Choose a time range to back up your chats.</p>
      </div>

      <div className="w-full px-5 space-y-6 pt-6">
        {['From', 'To'].map((label, i) => {
          const date = dates[i]

          return (
            <div key={label}>
              <Label className="mb-1 block text-sm font-medium">
                {label} date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                    disabled={i === 1 && !fromDate}
                  >
                    {date
                      ? date.toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : `Pick ${label.toLowerCase()} date`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date ?? undefined}
                    onSelect={(d) => d && updateDate(i)(d)}
                    disabled={(d) => d > now}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )
        })}

        <p className="text-xs text-muted-foreground">
          You can back up chats up to {maxWeeks} weeks
        </p>

        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
      </div>

      <div className="sticky bottom-0 w-full p-5">
        <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
          Continue
        </Button>
      </div>
    </form>
  )
}
