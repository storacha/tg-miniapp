import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '../ui/button'
import { Upload, ShieldCheck } from 'lucide-react'
import { useBackups } from '@/providers/backup'
import { useTelegram } from '@/providers/telegram'
import { MouseEventHandler, useEffect, useState } from 'react'
import { Dialog } from '@/vendor/telegram/tl/custom/dialog'
import { Backup } from '@/api'
import { decodeStrippedThumb, toJPGDataURL } from '@/lib/utils'

interface DialogItemProps {
	dialog: Dialog
	onClick: MouseEventHandler
	latestBackup?: Backup
}

const DialogItem = ({ dialog, onClick, latestBackup }: DialogItemProps) => {
	const title = (dialog.name ?? dialog.title ?? '').trim() || 'Unknown'
	const parts = title.replace(/[^a-zA-Z ]/ig, '').trim().split(' ')
	const initials = parts.length === 1 ? title[0] : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()

	let thumbSrc = ''
	// @ts-expect-error Telegram types are messed up
	const strippedThumbBytes = dialog.entity?.photo?.strippedThumb
	if (strippedThumbBytes) {
		thumbSrc = toJPGDataURL(decodeStrippedThumb(strippedThumbBytes))
	}

	let latestBackupDate
	if (latestBackup) {
		latestBackupDate = new Date(latestBackup.period[1] * 1000)
	}

	return (
		<div className="flex justify-start gap-10 items-center active:bg-accent px-5 py-3" data-id={String(dialog.id)} onClick={onClick}>
			<div className="flex gap-4 items-center">
				<Avatar>
					<AvatarImage src={thumbSrc} />
					<AvatarFallback>{initials}</AvatarFallback>
				</Avatar>
				<div>
					<h1 className="font-semibold text-foreground/80">{title}</h1>
					<p className="text-sm text-foreground/60">Last Backup: {latestBackupDate ? latestBackupDate.toLocaleString() : <span className="text-red-900">Never</span>}</p>
				</div>
			</div>
		</div>
	)
}

export default function BackedChats() {
	const [{ client }] = useTelegram()
	const [{ backups }] = useBackups()
	const [dialogs, setDialogs] = useState<Dialog[]>([])
	const [loading, setLoading] = useState(true)

	const sortedBackups = backups.items.sort((a, b) => b.period[1] - a.period[1])

	useEffect(() => {
		let cancel = false
		const dialogs = []
		;(async () => {
			if (!client.connected) await client.connect()
			for await (const dialog of client.iterDialogs()) {
				if (cancel) return
				if (loading) setLoading(false)
				dialogs.push(dialog)
				setDialogs([...dialogs])
			}
		})()
		return () => { cancel = true }
	}, [client])

	const handleDialogItemClick: MouseEventHandler = e => {
		const id = BigInt(e.currentTarget.getAttribute('data-id') ?? 0)
		console.log('TODO: display backup', id)
		// TODO: display backup
	}

	return (
		<div className="flex flex-col gap-5">
			<h1 className="px-5">Chats</h1>
			{backups.items.length === 0 && (
				<div className="flex flex-col justify-center items-center px-10 pt-20 gap-2">
					<div className="text-foreground/40 p-2">
						<ShieldCheck size={30} />
					</div>
					<p className="text-lg font-semibold text-foreground/40">Storacha is Safe</p>
					<p className="text-center text-sm text-foreground/40">Secure your data today with our encrypted storage.</p>
				</div>
			)}
			<div className="flex flex-col">
				{dialogs.map(d => {
					const latestBackup = sortedBackups.find(b => d.id && b.dialogs.has(d.id.value))
					return <DialogItem key={String(d.id)} dialog={d} latestBackup={latestBackup} onClick={handleDialogItemClick} />
				})}
			</div>
		</div>
	)
}
