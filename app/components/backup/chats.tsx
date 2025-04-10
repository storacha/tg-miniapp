import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTelegram } from '@/providers/telegram'
import { Button } from '../ui/button'
import { ChangeEventHandler, useEffect, useState } from 'react'
import { Dialog } from '@/vendor/telegram/tl/custom/dialog'
import { decodeStrippedThumb, toJPGDataURL } from '@/lib/utils'

interface Filter {
	(dialog: Dialog): boolean
}

const and = (...filters: Filter[]) => (dialog: Dialog) => filters.every(f => f(dialog))

const filterPrivate = (dialog: Dialog) => !dialog.isChannel
const filterPublic = (dialog: Dialog) => dialog.isChannel
const filterAll = () => true

const toSearchFilter = (term: string) => (dialog: Dialog) => {
	const title = dialog.name ?? dialog.title ?? ''
	return title.toLowerCase().includes(term.toLowerCase())
}

function DialogItem({ dialog, selected, onToggle }: { dialog: Dialog, selected: boolean, onToggle: () => unknown }) {
	const title = (dialog.name ?? dialog.title ?? '').trim() || 'Unknown'
	const parts = title.replace(/[^a-zA-Z ]/ig, '').split(' ')
	const initials = parts.length === 1 ? title[0] : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()

	let thumbSrc = ''
	// @ts-expect-error Telegram types are messed up
	const strippedThumbBytes = dialog.entity?.photo?.strippedThumb
	if (strippedThumbBytes) {
		thumbSrc = toJPGDataURL(decodeStrippedThumb(strippedThumbBytes))
	}

	return (
		<div className="flex justify-start gap-10 items-center active:bg-accent px-5 py-3" onClick={onToggle}>
			<Checkbox checked={selected} />
			<div className="flex gap-4 items-center">
				<Avatar>
					<AvatarImage src={thumbSrc} />
					<AvatarFallback>{initials}</AvatarFallback>
				</Avatar>
				<div>
					<h1 className="font-semibold text-foreground/80">{title}</h1>
					<p className="text-sm text-foreground/60">Last Backup: Today at 11:2 AM</p>
				</div>
			</div>
		</div>
	)
}

export default function Chats() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [{ client }] = useTelegram()
	const searchTerm = searchParams.get('q') ?? ''
	const [dialogs, setDialogs] = useState<Dialog[]>([])
	const [selections, setSelections] = useState<Set<bigint>>(new Set())
	const [typeFilter, setTypeFilter] = useState<Filter>(() => filterAll)
	const [searchFilter, setSearchFilter] = useState<Filter>(() => filterAll)
	const items = dialogs.filter(and(typeFilter, searchFilter))

	useEffect(() => {
		let cancel = false
		const dialogs = []
		;(async () => {
			if (!client.connected) await client.connect()
			for await (const dialog of client.iterDialogs()) {
				if (cancel) return
				dialogs.push(dialog)
				setDialogs([...dialogs])
			}
		})()
		return () => { cancel = true }
	}, [client])

	useEffect(() => {
		const filter = searchTerm ? toSearchFilter(searchTerm) : filterAll
		setSearchFilter(() => filter)
	}, [searchParams, searchTerm])

	const handleSearchChange: ChangeEventHandler<HTMLInputElement> = e => {
		e.preventDefault()
		const params = new URLSearchParams(searchParams)
		params.set('q', e.target.value)
		router.push(window.location.pathname + '?' + params)
	}

	return (
		<div>
			<div className="w-full pt-0 px-5 flex flex-col text-center justify-center gap-2 pb-5">
				<h1 className="text-lg font-semibold text-foreground text-center">Select to Backup</h1>
			</div>
			<div className="flex flex-col gap-5 rounded-t-xl bg-background w-full flex-grow py-2">
				<div className="px-5">
					<form className="relative w-full">
						<Input type="search" placeholder="search chats" onChange={handleSearchChange} />
					</form>
				</div>
				<div className="px-5 flex gap-5">
					<Button size="sm" variant={typeFilter === filterAll ? 'outline' : 'secondary'} onClick={() => setTypeFilter(() => filterAll)}>
						All
					</Button>
					<Button size="sm" variant={typeFilter === filterPublic ? 'outline' : 'secondary'} onClick={() => setTypeFilter(() => filterPublic)}>
						Public
					</Button>
					<Button size="sm" variant={typeFilter === filterPrivate ? 'outline' : 'secondary'} onClick={() => setTypeFilter(() => filterPrivate)}>
						Private
					</Button>
				</div>
				<div className="flex flex-col min-h-screen">
					{items.map(d => {
						const handleToggle = () => {
							if (!selections.delete(d.id)) {
								selections.add(d.id)
							}
							setSelections(new Set(selections))
						}
						return <DialogItem key={d.id} dialog={d} selected={selections.has(d.id)} onToggle={handleToggle} />
					})}
					{!items.length && <p className='text-center'>No chats found!</p>}
				</div>
			</div>
		</div>
	)
}
