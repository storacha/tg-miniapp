import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from '@/components/ui/drawer'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AlignJustify, LogOut } from 'lucide-react'
import { Button } from '../ui/button'
import { Progress } from '@/components/ui/progress'
import { useTelegram } from '@/providers/telegram'
import { useGlobal } from '@/zustand/global'
import { MouseEventHandler } from 'react'

export function Menu() {
	const [{ client, user }] = useTelegram()
	const { phoneNumber, setIsTgAuthorized, setIsStorachaAuthorized, setPhoneNumber } = useGlobal()
	const initials = user?.firstName ? (user.firstName[0] + (user?.lastName?.[0] ?? '')).toUpperCase() : ''

	const handleLogOutClick: MouseEventHandler<HTMLButtonElement> = e => {
		e.preventDefault()
		if (!confirm('Are you sure you want to log out?')) return
		// TODO: I don't think this actually does anything 😱
		// There's no client logout method (there is in Python)
		client.session.delete()
		// TODO: remove other stuff in global?
		setPhoneNumber('')
		// TODO: remove Storacha auth data
		setIsTgAuthorized(false)
		setIsStorachaAuthorized(false)
	}

	return (
		<Drawer>
			<DrawerTrigger>
				<AlignJustify />
			</DrawerTrigger>
			<DrawerContent className="bg-blue-100 ">
				<DrawerTitle>
					<div className="px-5 flex justify-between items-center">
						<div className="flex items-center gap-2 py-5">
							<Avatar className="h-12 w-12">
								<AvatarImage src={user?.photoUrl} />
								<AvatarFallback>{initials}</AvatarFallback>
							</Avatar>
							<div className="flex flex-col justify-center">
								<p className="text-base">{user?.firstName} {user?.lastName ?? ''}</p>
								<p className="text-sm text-blue-600">{phoneNumber}</p>
							</div>
						</div>
						<button type="button" onClick={handleLogOutClick}>
							<LogOut />
						</button>
					</div>
				</DrawerTitle>

				{/* <div className="bg-background">
					<div className="py-5 px-5 flex flex-col gap-2 border-b border-foreground/10">
						<p className="text-base text-foreground/80">Storage</p>
						<Progress value={55} className="w-full" />
						<p className="text-sm text-foreground/80">45% of free 5 GB used</p>
					</div>
					<div className="p-5">
						<div className="flex flex-col justify-center items-center gap-5 py-5 bg-pink-100 px-5 rounded-xl">
							<div className="flex flex-col gap-2">
								<p className="text-center font-medium">🚀 Go Beyond Limits!</p>
								<p className="text-sm text-foreground/80 text-center">
									Get premium storage to save everything—documents, media, and memories with no limits!
								</p>
							</div>
							<Button className="w-full">Go Pro</Button>
						</div>
					</div>
				</div> */}
			</DrawerContent>
		</Drawer>
	)
}
