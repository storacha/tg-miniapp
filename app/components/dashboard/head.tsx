'use client'

import { Button } from '../ui/button'
import Coin from '../svgs/coin'
import { useRouter } from 'next/navigation'
import { useTelegram } from '@/providers/telegram'

export default function Head() {
	const router = useRouter()
	const [{ user }] = useTelegram()
	return (
		<div className="bg-background rounded-sm">
			<div className="flex justify-between items-center px-5 py-3">
				<p>Hi, {user?.firstName ?? ''}</p>
				<div className="flex items-center gap-10 text-blue-600">
					<p>#__</p>
					<div className="flex justify-center items-center gap-1">
						<Coin size={25} />
						<p>00</p>
					</div>
				</div>
			</div>
			<div className="flex justify-between items-center px-3 pb-4">
				<Button className="w-full bg-blue-500 hover:bg-blue-600" onClick={() => router.push('/leaderboard')}>
					Leaderboard
				</Button>
			</div>
		</div>
	)
}
