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
import { cn } from '@/lib/utils'

export interface DatesProps {
  period: Period
  onPeriodChange: (period: Period) => unknown
  onSubmit: () => unknown
}

const day = 60 * 60 * 24
const month = 30 * day

const durationNames: Record<string, number> = {
  twoWeeks: 2 * 7 * day,
  month,
  sixMonths: 6 * month,
}

const durationValues = Object.fromEntries(
  Object.entries(durationNames).map(([k, v]) => [v, k])
)

const toDurationName = ([from, to]: Period) => {
  const now = Math.floor(Date.now() / 1000)
  const duration = (to ?? now) - from
  const match = durationValues[duration]
  return match ?? (from > 0 ? 'custom' : 'allTime')
}

export default function Dates({
  period,
  onPeriodChange,
  onSubmit,
}: DatesProps) {
  const [{ accounts, client }] = useStoracha()
  const accountDid = accounts[0].did()

  const [customDate, setCustomDate] = useState<Date | null>(null)
  const [paying, setPaying] = useState<boolean | null>(null)

  const now = Math.floor(Date.now() / 1000)
  const durationKey = toDurationName(period)

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

  const isPaying = paying === true
  const maxWeeks = isPaying ? 52 : 2
  const minDate = new Date(Date.now() - maxWeeks * 7 * 24 * 60 * 60 * 1000)
  const maxDate = new Date()

  const handleValueChange = (value: string) => {
    if (value === 'custom') {
      // we should use the maximum allowed date range as the default
      // when 'custom' is selected
      const maxStart = Math.floor(minDate.getTime() / 1000)
      onPeriodChange([maxStart, now])
      setCustomDate(minDate)
      return
    }

    const d = durationNames[value]
    onPeriodChange(d ? [now - d, now] : [0])
  }

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault()
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

      <div className="rounded-t-xl w-full flex-grow py-2">
        <RadioGroup
          value={durationKey}
          onValueChange={handleValueChange}
          className="px-5"
        >
          <div className="flex items-center gap-2 border-b border-primary/10 py-3">
            <RadioGroupItem value="twoWeeks" id="twoWeeks" />
            <Label htmlFor="twoWeeks" className="flex-auto">
              Last 2 weeks
            </Label>
          </div>

          {isPaying && (
            <>
              <div className="flex items-center gap-2 border-b border-primary/10 py-3">
                <RadioGroupItem value="month" id="month" />
                <Label htmlFor="month" className="flex-auto">
                  Last month
                </Label>
              </div>
              <div className="flex items-center gap-2 border-b border-primary/10 py-3">
                <RadioGroupItem value="sixMonths" id="sixMonths" />
                <Label htmlFor="sixMonths" className="flex-auto">
                  Last 6 months
                </Label>
              </div>
            </>
          )}

          <div className="flex items-center gap-2 border-b border-primary/10 py-3">
            <RadioGroupItem value="allTime" id="allTime" />
            <Label htmlFor="allTime" className="flex-auto">
              All time
            </Label>
          </div>

          {isPaying && (
            <div className="flex items-center gap-2 border-b border-primary/10 py-3">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom" className="flex-auto">
                Custom range
              </Label>
            </div>
          )}
        </RadioGroup>

        {durationKey === 'custom' && (
          <div className="pt-4 px-5">
            <Label className="mb-1 block text-sm font-medium">
              Select date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !customDate && 'text-muted-foreground'
                  )}
                >
                  {customDate
                    ? customDate.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={customDate ?? undefined}
                  onSelect={(date) => {
                    if (!date) return
                    setCustomDate(date)
                    const start = Math.floor(date.getTime() / 1000)
                    onPeriodChange([start, now])
                  }}
                  disabled={(date) => date < minDate || date > maxDate}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs mt-1 text-muted-foreground">
              You can select up to {maxWeeks} weeks back.
            </p>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 w-full p-5">
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </div>
    </form>
  )
}
