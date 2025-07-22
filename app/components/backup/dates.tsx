import { useEffect, useState, FormEventHandler } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '../ui/button'
import { Period } from '@/api'
import { useW3 as useStoracha } from '@storacha/ui-react'
import { isPayingAccount } from '@/lib/storacha'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
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
  const [{ accounts, client }] = useStoracha()
  const accountDid = accounts[0].did()

  const [paying, setPaying] = useState<boolean | null>(null)
  const [dates, setDates] = useState<[Date | null, Date | null]>([
    // converting from seconds to milliseconds hence
    // multiplying by 1000 since Date() expects ms
    period[0] ? new Date(period[0] * 1000) : null, // from
    period[1] ? new Date(period[1] * 1000) : null, // to
  ])
  const [error, setError] = useState<string | null>(null)

  const [fromDate, toDate] = dates
  const now = new Date()
  const maxWeeks = paying ? 52 : 2
  // Get a date `maxWeeks` ago from today
  const minDate = new Date(now.getTime() - maxWeeks * MILLISECONDS_IN_A_WEEK)

  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        if (!client) return
        const result = await isPayingAccount(client, accountDid)
        if (mounted) setPaying(result)
      } catch (err) {
        console.error('Failed to check payment status', err)
        setPaying(false)
      }
    }
    check()
    return () => {
      mounted = false
    }
  }, [client, accountDid])

  useEffect(() => {
    // default to now(), if people do not select the toDate
    if (fromDate && !toDate) {
      setDates([fromDate, now])
    }
    // we should prevent inaccurate period selections
    // this would mostl-likely apply to paid accounts
    if (fromDate && toDate) {
      if (fromDate > toDate) {
        setError('Start date cannot be after end date.')
      } else {
        setError(null)
        const from = Math.floor(fromDate.getTime() / 1000)
        const to = Math.floor(toDate.getTime() / 1000)
        onPeriodChange([from, to])
      }
    }
  }, [dates, fromDate, toDate, onPeriodChange])

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault()
    if (!fromDate || !toDate || fromDate > toDate) return
    onSubmit()
  }

  if (paying === null) {
    return (
      <div className="p-6 text-sm text-muted-foreground text-center">
        Checking your plan...
      </div>
    )
  }

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
          const updateDate = (d: Date) => {
            const updated: [Date | null, Date | null] = [...dates]
            updated[i] = d
            setDates(updated)
          }

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
                    onSelect={(d) => d && updateDate(d)}
                    disabled={(d) => d < minDate || d > now}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )
        })}

        {/* should we show this to paying accounts? */}
        {!paying && (
          <p className="text-xs text-muted-foreground">
            You can back up chats up to {maxWeeks} weeks prior
          </p>
        )}

        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
      </div>

      <div className="sticky bottom-0 w-full p-5">
        <Button
          type="submit"
          className="w-full"
          disabled={!fromDate || !toDate || !!error}
        >
          Continue
        </Button>
      </div>
    </form>
  )
}
