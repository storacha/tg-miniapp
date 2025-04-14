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
import { BackupMetadata } from './backup-handler'
import * as Crypto from '../../lib/crypto'

async function getLastBackups() {
  let lastBackupKey: string | null = null
  const lastBackups = new Map<bigint, Date>()

  if (cloudStorage.getKeys.isAvailable() && cloudStorage.getItem.isAvailable()) {
    const keys = await cloudStorage.getKeys()

    for (const key of keys) {
		
      if (key.startsWith("bckp")) {
        const value = await cloudStorage.getItem(key)

        if (value) {
          const backup = JSON.parse(value)
          const backupDate = new Date(backup.date)

          for (const chatIdStr of backup.chats) {
            const chatId = BigInt(chatIdStr)

            if (!lastBackups.has(chatId) || lastBackups.get(chatId)! < backupDate) {
              lastBackups.set(chatId, backupDate)
			  lastBackupKey = key
            }
          }
        }
      }
    }
  } else {
   throw new Error("Cloud storage is not available.")
  }

  return { lastBackups, lastBackupKey}
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

export interface DialogItemProps { 
	dialog: Dialog, 
	selected: boolean, 
	onClick: MouseEventHandler, 
	lastBackupDate?: Date, 
	onViewBackup?: (chatId: string) => void 
}

function DialogItem({ dialog, selected, onClick, lastBackupDate, onViewBackup }: DialogItemProps) {
	const title = (dialog.name ?? dialog.title ?? '').trim() || 'Unknown'
	const parts = title.replace(/[^a-zA-Z ]/ig, '').trim().split(' ')
	const initials = parts.length === 1 ? title[0] : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
	const id = String(dialog.id)

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
					{ lastBackupDate && (
						<button 
						className="text-blue-500 underline text-sm" 
						onClick={(e) => { 
							e.stopPropagation()
							if(onViewBackup) onViewBackup(id) 
						}}
						>
						View Backup
						</button>
					)}
				</div>
			</div>
		</div>
	)
}

export function BackupViewer({ chatId, lastBackupKey, onClose }: { chatId: string, lastBackupKey: string, onClose: () => void }) {
	const [backupContent, setBackupContent] = useState<any>(null)
	const [loading, setLoading] = useState(true);
  
	useEffect(() => {
	  async function fetchBackup() {
		setLoading(true)
		let userKey 
		try {
			if (cloudStorage.setItem.isAvailable()) {
				userKey = await cloudStorage.getItem('user-key')
				const backup = await cloudStorage.getItem(lastBackupKey)
				if(backup){
					// get from cloud storage
					const content: BackupMetadata = JSON.parse(backup)
					const index = content.chats.findIndex(id => id === chatId)
					const cid = content.chatCids[index]

					console.log(`Fetching content under ${cid} from Storacha...`)
					const response = await fetch(`${process.env.NEXT_PUBLIC_STORACHA_GATEWAY_URL}/${cid}`)
					console.log(response)
					if (!response.ok) {
						throw new Error(`Failed to fetch content from gateway: ${response.statusText}`)
					}
					const encryptContent = await response.text()
					
					// decrypt
					const decryptedContent = await Crypto.decryptContent(encryptContent, userKey)
					console.log('decryptedContent: ', decryptedContent)
					setBackupContent(decryptedContent)
				}
			} else {
				throw new Error('unable to access cloud storage')
			}
		
		} catch (error) {
		  console.error("Failed to fetch backup:", error)
		} finally {
		  setLoading(false)
		}
	  }
	  fetchBackup()
	}, [chatId])
  
	if (loading) return <p>Loading backup...</p>
	if (!backupContent) return <p>No backup found for this chat.</p>
  
	return (
	  <div className="p-5">
		<h1 className="text-lg font-semibold">Backup for Chat {chatId.toString()}</h1>
		<pre className="bg-gray-100 p-3 rounded">{backupContent}</pre>
		<button className="mt-3 text-blue-500 underline" onClick={onClose}>Close</button>
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
	const [lastBackups, setLastBackups] = useState<Map<bigint, Date>>(new Map()) // chatId -> Date
	const [lastBackupKey, setLastBackupKey] = useState<string | null>(null)
	const [viewingChatId, setViewingChatId] = useState<string | null>(null)

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
			const {lastBackups, lastBackupKey} = await getLastBackups()
			setLastBackups(lastBackups)
			setLastBackupKey(lastBackupKey)
		}
		fetchBackups()
	}, [lastBackupKey])

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

	const handleViewBackup = (chatId: string) => {
		setViewingChatId(chatId)
	  }
	
	  const handleCloseViewer = () => {
		setViewingChatId(null)
	  }

	return (
		<div>
			{viewingChatId && lastBackupKey ? (
				<BackupViewer chatId={viewingChatId} onClose={handleCloseViewer} lastBackupKey={lastBackupKey} />
			) : (
			<>
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
						<DialogItem key={d.id} dialog={d} selected={selections.has(BigInt(d.id))} onClick={handleDialogItemClick} lastBackupDate={lastBackups.get(BigInt(d.id))} onViewBackup={handleViewBackup}/>
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
			</>
			)}
		</div>
	)
}
