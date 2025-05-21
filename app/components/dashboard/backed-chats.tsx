import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ShieldCheck, ChevronRight } from 'lucide-react'
import { useBackups } from '@/providers/backup'
import { useTelegram } from '@/providers/telegram'
import { MouseEventHandler, useEffect, useState } from 'react'
import { Backup, DialogInfo } from '@/api'
import { useRouter } from 'next/navigation'
import { useGlobal } from '@/zustand/global'

interface DialogItemProps {
	dialog: DialogInfo
	onClick: MouseEventHandler
	latestBackup?: Backup
}

const DialogItem = ({ dialog, onClick, latestBackup }: DialogItemProps) => {
	const {id, title, initials, thumbSrc} = dialog

	let latestBackupDate
	if (latestBackup) {
		latestBackupDate = new Date(latestBackup.params.period[1] * 1000)
	}

	const isClickable = !!latestBackup // Check if the dialog has a backup

	return (
		<div className="flex justify-start gap-10 items-center active:bg-accent px-5 py-3" 
			data-id={id} 
			onClick={isClickable ? onClick : undefined}
		>
			<div className="flex gap-4 items-center w-full">
				<Avatar className="flex-none">
					<AvatarImage src={thumbSrc} />
					<AvatarFallback>{initials}</AvatarFallback>
				</Avatar>
				<div className="flex-auto">
					<h1 className="font-semibold text-foreground/80">{title}</h1>
					<p className="text-sm text-foreground/60">Last Backup: {latestBackupDate ? latestBackupDate.toLocaleString() : <span className="text-red-900">Never</span>}</p>
				</div>
				<div className={`flex-none ${latestBackupDate ? '' : 'text-gray-300'}`}>
					<ChevronRight />
				</div>
			</div>
		</div>
	)
}

export default function BackedChats() {
	const router = useRouter()
	const [{ backups }] = useBackups()
	const {tgSessionString} =  useGlobal()
	const [loading, setLoading] = useState(true)
	const [{ dialogs }, {listDialogs, setDialogs}] = useTelegram()
	const [offsetParams, setOffsetParams] = useState<{limit: number, offsetId?: number, offsetDate?: number, offsetPeer?: string}>({ limit: 10 })
	const [hasMore, setHasMore] = useState(true)

	const sortedBackups = backups.items.sort((a, b) => b.params.period[1] - a.params.period[1])

	useEffect(() => {
		if (!tgSessionString || !hasMore) return

		let cancel = false;

		(async () => {
			try {
				setLoading(true)
				const { chats, offsetParams: newOffsetParams } = await listDialogs(offsetParams)
				if (cancel) return

				setDialogs([...chats])
				setOffsetParams(newOffsetParams)
				setHasMore(chats.length > 0)
			} catch (err) {
				console.error('Failed to fetch dialogs:', err)
			} finally {
				if (!cancel) setLoading(false)
			}
		})()

		return () => {
			cancel = true
		}
	}, [tgSessionString, offsetParams])

	const handleDialogItemClick: MouseEventHandler = e => {
		e.preventDefault()
		const id = e.currentTarget.getAttribute('data-id') ?? '0'
		const dialog = dialogs.find(d => d.id == id)
		if (!dialog) return
		router.push(`/dialog/${id}?type=${dialog.type}`)
	}

	return (
		<div className="flex flex-col gap-5 min-h-screen">
			<h1 className="px-5">Chats</h1>
			{backups.items.length === 0 && !loading && (
				<div className="flex flex-col justify-center items-center px-10 pt-20 gap-2">
					<div className="text-foreground/40 p-2">
						<ShieldCheck size={30} />
					</div>
					<p className="text-lg font-semibold text-foreground/40">Storacha is Safe</p>
					<p className="text-center text-sm text-foreground/40">Secure your data today with our encrypted storage.</p>
				</div>
			)}
			{backups.items.length > 0 && (
				<div className="flex flex-col">
					{loading && <p className='text-center'>Loading chats...</p>}
					{!loading && dialogs.map(d => {
						const latestBackup = sortedBackups.find(b => d.id && b.params.dialogs.includes(d.id))
						return <DialogItem key={String(d.id)} dialog={d} latestBackup={latestBackup} onClick={handleDialogItemClick} />
					})}
				</div>
			)}
		</div>
	)
}
