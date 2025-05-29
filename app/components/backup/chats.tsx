import { ChangeEventHandler, FormEventHandler, MouseEventHandler, useEffect, useRef, useState } from 'react'
import { DialogInfo } from '@/api'
import { useBackups } from '@/providers/backup'
import { useTelegram } from '@/providers/telegram'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { Checkbox } from '@/components/ui/checkbox'
import { DialogItem } from '@/components/backup/dialog-item'

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

export interface ChatsProps {
	selections: Set<bigint>
	onSelectionsChange: (selections: Set<bigint>) => unknown
	onSubmit: () => unknown
}

export default function Chats({ selections, onSelectionsChange, onSubmit }: ChatsProps) {
	const [{ backups }] = useBackups()
	const [searchTerm, setSearchTerm] = useState('')
	const [{ dialogs, loadingDialogs }, { loadMoreDialogs }] = useTelegram()

	const [typeFilter, setTypeFilter] = useState<Filter>(() => noFilter)
	const [searchFilter, setSearchFilter] = useState<Filter>(() => noFilter)

	const items = dialogs.filter(and(typeFilter, searchFilter))

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
					{items.map((d: DialogInfo) => {
						const latestBackup = sortedBackups.find(b => d.id && b.params.dialogs.includes(d.id))
						return (
							<div key={d.id} className="flex justify-start gap-10 items-center active:bg-accent px-5 py-3" data-id={d.id} onClick={handleDialogItemClick}>
								<Checkbox checked={selections.has(BigInt(d.id || 0))} />
								<DialogItem dialog={d} latestBackup={latestBackup} />
							</div>
						)
					})}
					{loadingDialogs && <p className='text-center'><Loading text={"Loading chats..."} /></p>}
					<div ref={observerRef} className="h-10" />
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
