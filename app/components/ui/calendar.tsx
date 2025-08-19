'use client'
import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      mode="single"
      navLayout="around"
      className={cn('p-3', className)}
      classNames={{
        caption: 'flex justify-center pt-1 relative items-center',
        nav: 'space-x-1 flex items-center',
        chevron: 'text-red-500',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell:
          'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
        today: 'text-red-600',
        selected: 'bg-red-600 text-white',
        row: 'flex w-full mt-2',
        cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-red-500 [&:has([aria-selected])]:text-white [&:has([aria-selected])]:rounded-md',
        day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors',
        day_selected: 'bg-red-500 text-white hover:bg-red-600 hover:text-white',
        day_today: 'bg-red-100 text-red-600 font-semibold',
        day_outside: 'text-muted-foreground opacity-50',
        day_disabled: 'text-muted opacity-50',
        day_range_middle: 'aria-selected:bg-red-500 aria-selected:text-white',
        day_hidden: 'invisible',
      }}
      {...props}
    />
  )
}
