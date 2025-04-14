import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '../ui/button'

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

export default function Chats() {
	return (
		<div>
			<div className="w-full pt-0 px-5 flex flex-col text-center justify-center gap-2 pb-5">
				<h1 className="text-lg font-semibold text-foreground text-center">Select to Backup</h1>
			</div>
			<div className="flex flex-col gap-5 rounded-t-xl bg-background w-full flex-grow py-2">
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
			</div>
		</div>
	)
}
