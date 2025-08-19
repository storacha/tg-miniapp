import { Podium as PodiumData, LeaderboardUser } from '@/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUserLocale } from '@/hooks/useUserLocale'
import { useTelegram } from '@/providers/telegram'
import Image from 'next/image'

function PodiumAvatar({ user }: { user: LeaderboardUser }) {
  const [{ user: tgUser }] = useTelegram()
  return (
    <Avatar className="h-12 w-12">
      <AvatarImage src={user.isMe ? tgUser?.photoUrl : ''} />
      <AvatarFallback>{user.initials}</AvatarFallback>
    </Avatar>
  )
}

export function Podium({ firstPlace, secondPlace, thirdPlace }: PodiumData) {
  const { formatNumber } = useUserLocale()
  return (
    <div className="flex justify-center items-end">
      <div className="flex flex-col">
        {secondPlace ? (
          <div className="flex flex-col gap-2 justify-center items-center py-10">
            <PodiumAvatar user={secondPlace} />
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm">{secondPlace.name}</p>
              <p className="bg-blue-100 px-2 py-1.5 rounded-sm text-xs font-medium">
                {formatNumber(secondPlace.points)} RP
              </p>
            </div>
          </div>
        ) : (
          ''
        )}
        <Image src="/rank-two.png" alt="silver" width={100} height={100} />
      </div>
      <div className="flex flex-col">
        {firstPlace ? (
          <div className="flex flex-col gap-4 justify-center items-center py-10">
            <PodiumAvatar user={firstPlace} />
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm">{firstPlace.name}</p>
              <p className="bg-blue-100 px-2 py-1.5 rounded-sm text-xs font-medium">
                {formatNumber(firstPlace.points)} RP
              </p>
            </div>
          </div>
        ) : (
          ''
        )}
        <Image src="/rank-one.png" alt="gold" width={100} height={100} />
      </div>
      <div className="flex flex-col">
        {thirdPlace ? (
          <div className="flex flex-col gap-4 justify-center items-center py-10">
            <PodiumAvatar user={thirdPlace} />
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm">{thirdPlace.name}</p>
              <p className="bg-blue-100 px-2 py-1.5 rounded-sm text-xs font-medium">
                {formatNumber(thirdPlace.points)} RP
              </p>
            </div>
          </div>
        ) : (
          ''
        )}
        <Image src="/rank-three.png" alt="bronze" width={100} height={100} />
      </div>
    </div>
  )
}
