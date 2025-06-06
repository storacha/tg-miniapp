import { Ranking } from '@/api'

export function Banner({ rank, percentile }: Ranking) {
  return (
    <div className="px-5">
      <div className="rounded-lg p-4 flex justify-between items-center gap-2 bg-yellow-100">
        <div className="flex items-center gap-3">
          <span className=" font-semibold text-blue-600">#{rank}</span>
          <p className="text-sm">
            You are doing better than {percentile.toFixed(2)}% of other players!
          </p>
        </div>
      </div>
    </div>
  )
}
