import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '../ui/button'
import { Upload, ShieldCheck } from 'lucide-react'
import { useBackedChats } from '@/zustand/backup-chats'
import { useBackups } from '@/providers/backup'

function ChatItem() {
	return (
		<div className="flex justify-between active:bg-accent px-5 py-3">
			<div className="flex gap-4 items-center">
				<Avatar>
					<AvatarImage src="https://github.com/shadcn.png" />
					<AvatarFallback>CN</AvatarFallback>
				</Avatar>
				<div>
					<h1 className="font-semibold text-foreground/80">Shadcn</h1>
					<p className="text-sm text-foreground/60">Theresa Webbs</p>
				</div>
			</div>
			<Button className="rounded-full h-10 w-10" variant="outline">
				<Upload className="text-primary" />
			</Button>
		</div>
	)
}

export default function BackedChats() {
	const [{ backups }] = useBackups()
	return (
		<div className="flex flex-col gap-5">
			<h1 className="px-5">Backed up Chats</h1>
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
				{backups.items.sort((a, b) => b.created - a.created).map((b) => (
					<div className="text-xs">
						ID: <span>{b.data.toString()}</span><br/>
						{new Date(b.created).toISOString()}
					</div>
					// <ChatItem key={chat.id} />
				))}
			</div>
		</div>
	)
}
