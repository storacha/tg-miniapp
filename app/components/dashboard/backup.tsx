'use client'

import { TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '../ui/button'
import { useRouter } from 'next/navigation'

function ChatItem() {
	return (
		<div className="flex justify-start gap-10 items-center active:bg-accent px-5 py-3">
			<Checkbox />
			<div className="flex gap-4 items-center">
				<Avatar>
					<AvatarImage src="https://github.com/shadcn.png" />
					<AvatarFallback>CN</AvatarFallback>
				</Avatar>
				<div>
					<h1 className="font-semibold text-foreground/80">Shadcn</h1>
					<p className="text-sm text-foreground/60">Last Backup: Today at 11:2 AM</p>
				</div>
			</div>
		</div>
	)
}

export default function Backup() {
	const { push } = useRouter()
	return (
		<TabsContent value="backup" className="flex flex-col gap-5">
			<div className="px-5">
				<form className="relative w-full">
					<Input type="search" placeholder="search chats" />
				</form>
			</div>
			<div className="px-5 flex gap-5">
				<Button size="sm" variant="outline">
					All
				</Button>
				<Button size="sm" variant="outline">
					Public
				</Button>
				<Button size="sm" variant="outline">
					Private
				</Button>
			</div>
			<div className="flex flex-col">
				<ChatItem />
				<ChatItem />
				<ChatItem />
				<ChatItem />
				<ChatItem />
				<ChatItem />
			</div>
			<div className=" absolute bottom-0 w-full p-5">
				<Button className="w-full" onClick={() => push('/backup')}>
					Backup Now
				</Button>
			</div>
		</TabsContent>
	)
}
