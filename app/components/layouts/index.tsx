import { cn } from '@/lib/utils'
import { Header } from './header'

export function Layouts({
	children,
	isSinglePage,
	isBackgroundBlue,
	back,
}: { children: React.ReactNode; isSinglePage?: boolean; back?: () => void; isBackgroundBlue?: boolean }) {
	return (
		<div
			className={cn(
				'min-h-screen flex flex-col',
				isSinglePage ? cn(isBackgroundBlue ? 'bg-blue-100/80' : 'bg-background') : 'bg-blue-100/80 ',
			)}
		>
			<Header isSinglePage={isSinglePage} back={back} />
			{children}
		</div>
	)
}
