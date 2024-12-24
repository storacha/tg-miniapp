import { TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '../ui/button'
import { Upload } from 'lucide-react'

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

export default function Home() {
	return (
		<TabsContent value="home" className="flex flex-col gap-5">
			<h1 className="px-5">Backed up Chats</h1>
			<div className="flex flex-col">
				<ChatItem />
				<ChatItem />
				<ChatItem />
				<ChatItem />
				<ChatItem />
				<ChatItem />
			</div>
		</TabsContent>
	)
}
