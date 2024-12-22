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

import { AlignJustify } from 'lucide-react'

export function Menu() {
	return (
		<Drawer>
			<DrawerTrigger>
				<AlignJustify />
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Settings</DrawerTitle>
				</DrawerHeader>
				<DrawerFooter>
					<Button variant="outline">Profile</Button>
					<Button variant="outline">Profile</Button>
					<Button variant="outline">Profile</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	)
}
