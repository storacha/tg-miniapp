import { SpaceDID } from '@storacha/ui-react'
import { Period } from './dates'
import { Button } from '../ui/button'
import { FormEventHandler } from 'react'

export interface SummaryProps {
	chats: Set<bigint>
	space: SpaceDID
  period: Period
	onSubmit: () => unknown
}

export const Summary = ({ chats, space, period, onSubmit }: SummaryProps) => {
  const handleSubmit: FormEventHandler = e => {
    e.preventDefault()
    onSubmit()
  }
  return (
    <form onSubmit={handleSubmit}>
      <div className="w-full pt-0 px-5 flex flex-col text-center justify-center gap-2 pb-5">
				<h1 className="text-lg font-semibold text-foreground text-center">Ready?</h1>
        <p className="text-sm">Check the details before we start.</p>
			</div>
			<div className="flex flex-col gap-5 rounded-t-xl bg-background w-full flex-grow py-2">
        <div className="flex space-x-2 items-center gap-2 border-b border-primary/10 p-5">
          <p>{chats.size.toLocaleString()} Chat{chats.size === 1 ? '' : 's'}</p>
        </div>
        <div className="flex space-x-2 items-center gap-2 border-b border-primary/10 p-5">
          {period[0] === 0 && period[1] === Infinity ? (
            <p>Period: All time</p>
          ) : (
            <>
              <p>From: {new Date(period[0]).toLocaleDateString()}</p>
              <p>To: {new Date(period[1]).toLocaleDateString()}</p>
            </>
          )}
        </div>
        <div className="sticky bottom-0 w-full p-5">
          <Button type="submit" className="w-full">Start Backup</Button>
        </div>
      </div>
		</form>
  )
}