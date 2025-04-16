import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTelegram } from '@/providers/telegram'
import { Button } from '../ui/button'
import { ChangeEventHandler, FormEventHandler, MouseEventHandler, useEffect, useState } from 'react'
import { Dialog } from '@/vendor/telegram/tl/custom/dialog'
import { decodeStrippedThumb, toJPGDataURL } from '@/lib/utils'
import { cloudStorage } from "@telegram-apps/sdk-react";
import { Backup } from '@/api'

async function getLastBackups() {
  const lastBackups = new Map<bigint, Date>()

  if (cloudStorage.getKeys.isAvailable() && cloudStorage.getItem.isAvailable()) {
    const keys = await cloudStorage.getKeys()

    for (const key of keys) {
		
      if (key.startsWith("backup-")) {
        const value = await cloudStorage.getItem(key)

        if (value) {
          const backup: Backup = JSON.parse(value)
          const backupDate = new Date(backup.created)
		  const chats = Array.from(backup.dialogs)

          for (const chatId of chats) {
            if (!lastBackups.has(chatId) || lastBackups.get(chatId)! < backupDate) {
              lastBackups.set(chatId, backupDate)
            }
          }
        }
      }
    }
  } else {
    console.error("Cloud storage is not available.")
  }
  return lastBackups
}

interface Filter {
	(dialog: Dialog): boolean
}

const and = (...filters: Filter[]) => (dialog: Dialog) => filters.every(f => f(dialog))

const filterPrivate = (dialog: Dialog) => !dialog.isChannel
const filterPublic = (dialog: Dialog) => dialog.isChannel
const filterAll = () => true

const toTypeFilter = (n: string) =>
	n === 'public' ? filterPublic : n === 'private' ? filterPrivate : filterAll

const toSearchFilter = (t: string) => (dialog: Dialog) => {
	const title = dialog.name ?? dialog.title ?? ''
	return title.toLowerCase().includes(t.toLowerCase())
}

function DialogItem({ dialog, selected, onClick, lastBackupDate }: { dialog: Dialog, selected: boolean, onClick: MouseEventHandler, lastBackupDate?: Date }) {
	const title = (dialog.name ?? dialog.title ?? '').trim() || 'Unknown'
	const parts = title.replace(/[^a-zA-Z ]/ig, '').trim().split(' ')
	const initials = parts.length === 1 ? title[0] : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()

	let thumbSrc = ''
	// @ts-expect-error Telegram types are messed up
	const strippedThumbBytes = dialog.entity?.photo?.strippedThumb
	if (strippedThumbBytes) {
		thumbSrc = toJPGDataURL(decodeStrippedThumb(strippedThumbBytes))
	}

	return (
		<div className="flex justify-start gap-10 items-center active:bg-accent px-5 py-3" data-id={String(dialog.id)} onClick={onClick}>
			<Checkbox checked={selected} />
			<div className="flex gap-4 items-center">
				<Avatar>
					<AvatarImage src={thumbSrc} />
					<AvatarFallback>{initials}</AvatarFallback>
				</Avatar>
				<div>
					<h1 className="font-semibold text-foreground/80">{title}</h1>
					<p className="text-sm text-foreground/60">Last Backup: {lastBackupDate ? lastBackupDate.toLocaleString() : 'Never'}</p>
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
	const router = useRouter()
	const searchParams = useSearchParams()
	const [{ client }] = useTelegram()
	const [searchTerm, setSearchTerm] = useState(searchParams.get('q') ?? '')
	const [dialogs, setDialogs] = useState<Dialog[]>([])
	const [loading, setLoading] = useState(true)
	const [lastBackups, setLastBackups] = useState<Map<bigint, Date>>(new Map())

	const typeFilter = toTypeFilter(searchParams.get('t') ?? 'all')
	const searchFilter = toSearchFilter(searchParams.get('q') ?? '')
	const items = dialogs.filter(and(typeFilter, searchFilter))

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

	useEffect(() => {
		async function fetchBackups() {
			const backups = await getLastBackups()
			setLastBackups(backups)
		}
		fetchBackups()
	}, [])

	const handleSearchChange: ChangeEventHandler<HTMLInputElement> = e => {
		setSearchTerm(e.target.value)
		if (!e.target.value) {
			const params = new URLSearchParams(searchParams)
			params.set('q', '')
			router.push(window.location.pathname + '?' + params)
		}
	}

	const handleSearchSubmit: FormEventHandler<HTMLFormElement> = e => {
		e.preventDefault()
		const params = new URLSearchParams(searchParams)
		params.set('q', searchTerm)
		router.push(window.location.pathname + '?' + params)
	}

	const handleTypeClick: MouseEventHandler<HTMLButtonElement> = e => {
		e.preventDefault()
		const type = e.currentTarget.getAttribute('data-type') ?? 'all'
		const params = new URLSearchParams(searchParams)
		params.set('t', type)
		router.push(window.location.pathname + '?' + params)
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
					<Button size="sm" variant={typeFilter === filterAll ? 'outline' : 'secondary'} data-type='all' onClick={handleTypeClick}>
						All
					</Button>
					<Button size="sm" variant={typeFilter === filterPublic ? 'outline' : 'secondary'} data-type='public' onClick={handleTypeClick}>
						Public
					</Button>
					<Button size="sm" variant={typeFilter === filterPrivate ? 'outline' : 'secondary'} data-type='private' onClick={handleTypeClick}>
						Private
					</Button>
				</div>
				<div className="flex flex-col min-h-screen">
					{items.map(d => (
						<DialogItem key={d.id} dialog={d} selected={selections.has(BigInt(d.id))} onClick={handleDialogItemClick} lastBackupDate={lastBackups.get(BigInt(d.id))} />
					))}
					{loading && <p className='text-center'>Loading chats...</p>}
					{!loading && !items.length && <p className='text-center'>No chats found!</p>}
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
