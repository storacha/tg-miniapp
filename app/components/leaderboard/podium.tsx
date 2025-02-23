import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Image from 'next/image'

export function Podium() {
	return (
		<div className="flex justify-center items-end">
			<div className="flex flex-col">
				<div className="flex flex-col gap-2 justify-center items-center py-10">
					<Avatar className="h-12 w-12">
						<AvatarImage src="https://github.com/shadcn.png" />
						<AvatarFallback>CN</AvatarFallback>
					</Avatar>
					<div className="flex flex-col items-center gap-1">
						<p className="text-sm">Alena Donin</p>
						<p className="bg-blue-100 px-2 py-1.5 rounded-sm text-xs font-medium">1,209 RP</p>
					</div>
				</div>
				<Image src="/rank-two.png" alt="gold" width={100} height={100} />
			</div>
			<div className="flex flex-col">
				<div className="flex flex-col gap-4 justify-center items-center py-10">
					<Avatar className="h-12 w-12">
						<AvatarImage src="https://github.com/shadcn.png" />
						<AvatarFallback>CN</AvatarFallback>
					</Avatar>
					<div className="flex flex-col items-center gap-1">
						<p className="text-sm">Alena Donin</p>
						<p className="bg-blue-100 px-2 py-1.5 rounded-sm text-xs font-medium">1,209 RP</p>
					</div>
				</div>
				<Image src="/rank-one.png" alt="gold" width={100} height={100} />
			</div>
			<div className="flex flex-col">
				<div className="flex flex-col gap-4 justify-center items-center py-10">
					<Avatar className="h-12 w-12">
						<AvatarImage src="https://github.com/shadcn.png" />
						<AvatarFallback>CN</AvatarFallback>
					</Avatar>
					<div className="flex flex-col items-center gap-1">
						<p className="text-sm">Alena Donin</p>
						<p className="bg-blue-100 px-2 py-1.5 rounded-sm text-xs font-medium">1,209 RP</p>
					</div>
				</div>
				<Image src="/rank-three.png" alt="gold" width={100} height={100} />
			</div>
		</div>
	)
}
