import { MouseEventHandler, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ChevronRight } from 'lucide-react'
import { useBackups } from '@/providers/backup'
import { useTelegram } from '@/providers/telegram'
import { Loading } from '@/components/ui/loading'
import { DialogItem } from '@/components/backup/dialog-item'

export default function BackedChats() {
	const router = useRouter()
	const [{ backups }] = useBackups()
	const [{ dialogs, loadingDialogs }, { loadMoreDialogs }] = useTelegram()

	const sortedBackups = backups.items.sort((a, b) => b.params.period[1] - a.params.period[1])
	const observerRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		if (!observerRef.current) return

		const observer = new IntersectionObserver(
			entries => {
				if (entries[0].isIntersecting && !loadingDialogs) {
					loadMoreDialogs()
				}
			},
			{
				threshold: 0.1,
			}
		)

		observer.observe(observerRef.current)
		return () => observer.disconnect()
	}, [loadMoreDialogs, loadingDialogs])

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
			{backups.items.length === 0 ? (
					<div className="flex flex-col justify-center items-center px-10 pt-20 gap-2">
						<div className="text-foreground/40 p-2">
							<ShieldCheck size={30} />
						</div>
						<p className="text-lg font-semibold text-foreground/40">Storacha is Safe</p>
						<p className="text-center text-sm text-foreground/40">Secure your data today with our encrypted storage.</p>
					</div>
				) : (
					<div className="flex flex-col">
						{loadingDialogs && <p className='text-center'><Loading text={"Loading chats..."} /></p>}
						{!loadingDialogs && dialogs.map(d => {
							const latestBackup = sortedBackups.find(b => d.id && b.params.dialogs.includes(d.id))
							if (!latestBackup) return null
							return (
								<div key={d.id} className="flex justify-start gap-10 items-center active:bg-accent px-5 py-3" data-id={d.id} onClick={handleDialogItemClick}>
									<DialogItem  dialog={d} latestBackup={latestBackup} />
									<div className={`flex-none`}>
										<ChevronRight />
									</div>
								</div>
							)
						})}
						<div ref={observerRef} className="h-10" />
						{loadingDialogs && <p className='text-center'>Loading chats...</p>}
					</div>
				)
			}
		</div>
	)
}
