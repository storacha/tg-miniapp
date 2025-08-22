import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AlignJustify, LogOut } from 'lucide-react'
import { useTelegram } from '@/providers/telegram'
import { useGlobal } from '@/zustand/global'
import { MouseEventHandler } from 'react'
import { useLogout } from '@/hooks/useLogout'

export function Menu() {
  const [{ user }] = useTelegram()
  const { phoneNumber } = useGlobal()
  const logout = useLogout()
  const initials = user?.firstName
    ? (user.firstName[0] + (user?.lastName?.[0] ?? '')).toUpperCase()
    : ''

  const handleLogOutClick: MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault()
    if (!confirm('Are you sure you want to log out?')) return
    await logout()
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
                <p className="text-base">
                  {user?.firstName} {user?.lastName ?? ''}
                </p>
                <p className="text-sm text-blue-600">{phoneNumber}</p>
              </div>
            </div>
            <button type="button" onClick={handleLogOutClick}>
              <LogOut />
            </button>
          </div>
        </DrawerTitle>
      </DrawerContent>
    </Drawer>
  )
}
