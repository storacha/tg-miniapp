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
				<h1 className="text-lg font-semibold text-foreground text-center">Summary</h1>
			</div>
			<div className="flex flex-col gap-5 rounded-t-xl bg-background w-full flex-grow py-2">
        <p>{chats.size} Chats</p>
        <p>Destination: {space}</p>
        {period[0] === 0 && period[1] === Infinity ? (
          <p>Period: All time</p>
        ) : (
          <>
            <p>From: {new Date(period[0]).toLocaleString()}</p>
            <p>To: {new Date(period[1]).toLocaleString()}</p>
          </>
        )}
        <div className="sticky bottom-0 w-full p-5">
          <Button type="submit" className="w-full">Start Backup</Button>
        </div>
      </div>
		</form>
  )
}