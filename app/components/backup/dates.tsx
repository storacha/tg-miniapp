import { useEffect, useState, FormEventHandler, useMemo, useCallback } from 'react'
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
  onPeriodChange: (period: Period) => unknown
  onSubmit: () => unknown
}

const MILLISECONDS_IN_A_WEEK = 7 * 24 * 60 * 60 * 1000

export default function Dates({ onPeriodChange, onSubmit }: DatesProps) {
  const [{ accounts, client }] = useStoracha()
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState<boolean | null>(null)

  const maxWeeks = paying
    ? MAX_BACKUP_WEEKS_PAID_TIER
    : MAX_BACKUP_WEEKS_FREE_TIER

  const maxDurationMs = maxWeeks * MILLISECONDS_IN_A_WEEK

  const now = new Date()
  
  // Calculate earliest allowed date based on current subscription status
  const earliestAllowedFrom = useMemo(() => {
    return new Date(now.getTime() - maxDurationMs)
  }, [maxDurationMs])

  const [dates, setDates] = useState<[Date, Date]>([earliestAllowedFrom, now])
  const [fromDate, toDate] = dates
  const accountDid = accounts[0]?.did()

  // Check payment status
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

  // Update dates when subscription status changes
  useEffect(() => {
    const newEarliestAllowed = new Date(now.getTime() - maxDurationMs)
    
    if (paying !== null) {
      // Adjust dates to respect new limits
      let newFromDate = fromDate
      let newToDate = toDate
      
      // If current from date is before new earliest allowed, adjust it
      if (fromDate < newEarliestAllowed) {
        newFromDate = newEarliestAllowed
      }
      
      // If current range exceeds new limits, adjust toDate
      const currentDuration = newToDate.getTime() - newFromDate.getTime()
      if (currentDuration > maxDurationMs) {
        newToDate = new Date(newFromDate.getTime() + maxDurationMs)
      }
      
      setDates([newFromDate, newToDate])
    }
  }, [paying, maxDurationMs, fromDate, toDate])

  // Normalize dates to proper time boundaries
  const normalizeDates = useCallback((from: Date, to: Date) => {
    if (!from || !to) return [from, to]

    const actualTo = to
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

    const earliestAllowed = new Date(
      normalizedTo.getTime() - maxDurationMs
    )
    
    let normalizedFrom = from
    
    // Ensure from date isn't before earliest allowed
    if (normalizedFrom < earliestAllowed) {
      normalizedFrom = new Date(earliestAllowed)
    }
    
    // Set to start of day
    normalizedFrom.setHours(0, 0, 0, 0)

    return [normalizedFrom, normalizedTo]
  }, [now, maxDurationMs])

  // Validate date range
  const validateDateRange = useCallback((from: Date, to: Date): string | null => {
    if (!from || !to) return null

    if (from > to) return 'Start date cannot be after end date.'
    if (to > now) return 'End date cannot be in the future.'

    const durationMs = to.getTime() - from.getTime()
    
    if (durationMs > maxDurationMs) {
      return `Date range cannot exceed ${maxWeeks} week${maxWeeks > 1 ? 's' : ''}.`
    }

    // Check if from date is before earliest allowed
    if (from < earliestAllowedFrom) {
      return `Start date cannot be earlier than ${earliestAllowedFrom.toLocaleDateString()}.`
    }

    return null
  }, [now, maxDurationMs, maxWeeks, earliestAllowedFrom])

  // Update period when dates change
  useEffect(() => {
    if (fromDate && toDate) {
      const [normalizedFrom, normalizedTo] = normalizeDates(fromDate, toDate)
      const validationError = validateDateRange(normalizedFrom, normalizedTo)

      if (validationError) {
        setError(validationError)
      } else {
        setError(null)
        const from = Math.floor(normalizedFrom.getTime() / 1000)
        const to = Math.floor(normalizedTo.getTime() / 1000)
        onPeriodChange([from, to])
      }
    }
  }, [fromDate, toDate, onPeriodChange, normalizeDates, validateDateRange])

  // Update date handler
  const updateDate = useCallback((index: number) => (selectedDate: Date) => {
    if (!selectedDate) return
    
    const updated: [Date, Date] = [...dates]
    updated[index] = selectedDate
    
    // Ensure the other date respects the new selection
    if (index === 0) {
      // Updating from date
      const maxAllowedTo = new Date(selectedDate.getTime() + maxDurationMs)
      if (updated[1] > maxAllowedTo) {
        updated[1] = maxAllowedTo
      }
    } else {
      // Updating to date
      const minAllowedFrom = new Date(selectedDate.getTime() - maxDurationMs)
      if (updated[0] < minAllowedFrom) {
        updated[0] = minAllowedFrom
      }
    }
    
    setDates(updated)
  }, [dates, maxDurationMs])

  // Get disabled dates for calendar
  const getDisabledDates = useCallback((index: number) => {
    const isFrom = index === 0

    return {
      invalid: (date: Date) => {
        if (isFrom) {
          // For from date: disable dates that would make range too long
          const maxAllowedTo = new Date(date.getTime() + maxDurationMs)
          return date < earliestAllowedFrom || maxAllowedTo > now
        } else {
          // For to date: disable dates that would make range too long
          if (fromDate) {
            const minAllowedFrom = new Date(date.getTime() - maxDurationMs)
            return date > now || minAllowedFrom > fromDate
          }
          return date > now
        }
      },
    }
  }, [maxDurationMs, earliestAllowedFrom, fromDate, now])

  // Get calendar month to show
  const getCalendarMonth = useCallback((index: number) => {
    const date = dates[index]
    if (date) return date
    
    // Show appropriate month based on which date is being selected
    if (index === 0) {
      // For from date, show month around earliest allowed date
      return earliestAllowedFrom
    } else {
      // For to date, show current month
      return now
    }
  }, [dates, earliestAllowedFrom, now])

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault()
    if (!fromDate || !toDate || fromDate > toDate || error) return
    onSubmit()
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
        <p className="text-xs text-muted-foreground">
          {paying ? 'Premium Plan' : 'Free Plan'}: Up to {maxWeeks} week{maxWeeks > 1 ? 's' : ''} of chat history
        </p>
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
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date ?? undefined}
                    onSelect={(d) => d && updateDate(i)(d)}
                    disabled={(d) => getDisabledDates(i).invalid(d)}
                    defaultMonth={getCalendarMonth(i)}
                    modifiers={getDisabledDates(i)}
                    modifiersClassNames={{
                      invalid: 'text-muted-foreground opacity-40 cursor-not-allowed bg-gray-100',
                    }}
                    fromMonth={i === 0 ? earliestAllowedFrom : undefined}
                    toMonth={now}
                    captionLayout="dropdown-buttons"
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )
        })}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Free users can back up up to {MAX_BACKUP_WEEKS_FREE_TIER} weeks of chat history</p>
          <p>• Premium users can back up up to {MAX_BACKUP_WEEKS_PAID_TIER} weeks of chat history</p>
          <p>• Selected range: {fromDate && toDate ? `${Math.ceil((toDate.getTime() - fromDate.getTime()) / MILLISECONDS_IN_A_WEEK)} week${Math.ceil((toDate.getTime() - fromDate.getTime()) / MILLISECONDS_IN_A_WEEK) > 1 ? 's' : ''}` : '0 weeks'}</p>
        </div>
      </div>

      <div className="sticky bottom-0 w-full p-5 bg-background border-t border-border">
        <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
          Continue
        </Button>
      </div>
    </form>
  )
}
