import { MoveLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Menu } from './menu'
import { getInitials } from '@/lib/utils';

export function ChatHeader({ back, image, name, type }: { back?: () => void; image?: string; name: string; type: string }) {
	const { back: goBack } = useRouter()
	return (
		<header className="flex justify-between items-center p-5 z-10 sticky top-0 border-b border-border bg-muted">
			<div className="flex items-center gap-4 flex-grow">
                <button type="button" onClick={back || goBack}>
                    <MoveLeft />
                </button>

                <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14">
                        <AvatarImage src={image} />
                        <AvatarFallback className='bg-gray-300'>{getInitials(name)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-base font-semibold text-foreground">{name}</h1>
                        <p className="text-xs text-muted-foreground capitalize">{type}</p>
                    </div>
                </div>
            </div>

			<Menu />
		</header>
	)
}
