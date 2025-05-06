import { cn } from '@/lib/utils'
import { Header } from './header'

export function Layouts({
	children,
	isSinglePage,
	isBackgroundBlue,
	withHeader=true,
	back,
}: { children: React.ReactNode; isSinglePage?: boolean; back?: () => void; isBackgroundBlue?: boolean ; withHeader?: boolean }) {
	return (
		<div
			className={cn(
				'min-h-screen flex flex-col',
				isSinglePage ? cn(isBackgroundBlue ? 'bg-blue-100' : 'bg-background') : 'bg-blue-100 ',
			)}
		>
			
			{withHeader && (
				<div className={cn('sticky top-0 z-50', isBackgroundBlue ? 'bg-blue-100' : 'bg-background')}>
					<Header isSinglePage={isSinglePage} back={back} />
			 	</div>
			)}
			{children}
		</div>
	)
}
