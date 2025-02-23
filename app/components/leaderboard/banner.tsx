import { Button } from '../ui/button'

export function Banner() {
	return (
		<div className="px-5">
			<div className="rounded-lg p-4 flex justify-between items-center gap-2 bg-yellow-100">
				<div className="flex items-center gap-3">
					<span className=" font-semibold text-blue-600">#4</span>
					<p className="text-sm">You are doing better than 60% of other players!</p>
				</div>
				<Button size="sm">Earn more</Button>
			</div>
		</div>
	)
}
