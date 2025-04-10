import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@/components/ui/drawer'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

export function Connect() {
	return (
		<Drawer>
			<DrawerTrigger asChild>
				<div className="sticky bottom-0 w-full p-5">
					<Button className="w-full">Continue</Button>
				</div>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Connect Your Storacha Account</DrawerTitle>
					<DrawerDescription>You need to connect your Storacha account to back up your chats.</DrawerDescription>
				</DrawerHeader>
				<DrawerFooter className="gap-5 pb-10">
					<Input type="text" placeholder="Enter your email" />
					<Button>Connect Now</Button>
					<DrawerDescription>You need to connect your Storacha account to back up your chats.</DrawerDescription>
					<DrawerDescription>You need to connect your Storacha account to back up your chats.</DrawerDescription>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	)
}
