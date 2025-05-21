import { ChangeEventHandler, FormEventHandler, MouseEventHandler, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useTelegram } from '@/providers/telegram'
import { Button } from '../ui/button'
import { Backup, DialogInfo } from '@/api'
import { useBackups } from '@/providers/backup'

interface Filter {
	(dialog: DialogInfo): boolean
}

const and = (...filters: Filter[]) => (dialog: DialogInfo) => filters.every(f => f(dialog))

const filterPrivate = (dialog: DialogInfo) => !dialog.isPublic
const filterPublic = (dialog: DialogInfo) => dialog.isPublic
const noFilter = () => true

const toSearchFilter = (t: string) => (dialog: DialogInfo) => {
	return dialog.title.toLowerCase().includes(t.toLowerCase())
}

function DialogItem({ dialog, selected, onClick, latestBackup }: { dialog: DialogInfo, selected: boolean, onClick: MouseEventHandler, latestBackup?: Backup }) {
	const {id, title, initials, thumbSrc} = dialog

	let latestBackupDate
	if (latestBackup) {
		latestBackupDate = new Date(latestBackup.params.period[1] * 1000)
	}

	return (
		<div className="flex justify-start gap-10 items-center active:bg-accent px-5 py-3" data-id={id} onClick={onClick}>
			<Checkbox checked={selected} />
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

export interface ChatsProps {
	selections: Set<bigint>
	onSelectionsChange: (selections: Set<bigint>) => unknown
	onSubmit: () => unknown
}

export default function Chats({ selections, onSelectionsChange, onSubmit }: ChatsProps) {
	const [{ backups }] = useBackups()
	const [searchTerm, setSearchTerm] = useState('')
	const [{ dialogs, loadingDialogs }] = useTelegram()

	const [typeFilter, setTypeFilter] = useState<Filter>(() => noFilter)
	const [searchFilter, setSearchFilter] = useState<Filter>(() => noFilter)

	const items = dialogs.filter(and(typeFilter, searchFilter))

	const sortedBackups = backups.items.sort((a, b) => b.params.period[1] - a.params.period[1])

	const handleSearchChange: ChangeEventHandler<HTMLInputElement> = e => {
		setSearchTerm(e.target.value)
		if (!e.target.value) {
			setSearchFilter(() => noFilter)
		}
	}

	const handleSearchSubmit: FormEventHandler<HTMLFormElement> = e => {
		e.preventDefault()
		setSearchFilter(() => toSearchFilter(searchTerm))
	}

	const handleDialogItemClick: MouseEventHandler = (e) => {
		const id = BigInt(e.currentTarget.getAttribute('data-id') ?? 0)
		const nextSelections = new Set(selections)
		if (!nextSelections.delete(id)) {
			nextSelections.add(id)
		}
		onSelectionsChange(nextSelections)
	}

	const handleSubmit: FormEventHandler = e => {
		e.preventDefault()
		onSubmit()
	}

	return (
		<div>
			<div className="w-full pt-0 px-5 flex flex-col text-center justify-center gap-2 pb-5">
				<h1 className="text-lg font-semibold text-foreground text-center">Select to Backup</h1>
			</div>
			<div className="flex flex-col gap-5 rounded-t-xl bg-background w-full flex-grow py-2">
				<div className="px-5">
					<form className="relative w-full" onSubmit={handleSearchSubmit}>
						<Input type="search" placeholder="search chats" value={searchTerm} onChange={handleSearchChange} />
					</form>
				</div>
				<div className="px-5 flex gap-5">
					<Button size="sm" variant={typeFilter === noFilter ? 'outline' : 'secondary'} onClick={() => setTypeFilter(() => noFilter)}>
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
						const latestBackup = sortedBackups.find(b => d.id && b.params.dialogs.includes(d.id))
						return <DialogItem key={d.id} dialog={d} selected={selections.has(BigInt(d.id || 0))} onClick={handleDialogItemClick} latestBackup={latestBackup} />
					})}
					{loadingDialogs && <p className='text-center'>Loading chats...</p>}
					{!loadingDialogs && !items.length && <p className='text-center'>No chats found!</p>}
				</div>
			</div>
			<form onSubmit={handleSubmit} className="sticky bottom-0 w-full p-5">
				<Button type="submit" className="w-full" disabled={!selections.size}>
					Continue
				</Button>
			</form>
		</div>
	)
}
