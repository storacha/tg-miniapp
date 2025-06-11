import { LeaderboardUser } from '@/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

function User({ user, rank }: { user: LeaderboardUser; rank: number }) {
  return (
    <div className="flex justify-between active:bg-accent px-5 py-3">
      <div className="flex gap-4 items-center">
        <p className=" text-blue-600">#{rank}</p>
        <Avatar>
          <AvatarImage src={user.thumbSrc} />
          <AvatarFallback>{user.initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-semibold text-foreground/80">{user.name}</h1>
          <p className="text-sm text-foreground/60">
            {user.points.toLocaleString()} Points
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Users({ users }: { users: LeaderboardUser[] }) {
  return (
    <div className="flex flex-col py-10 bg-background h-full rounded-t-xl">
      {users.map((user, i) => (
        <User key={user.id} user={user} rank={i + 1} />
      ))}
    </div>
  )
}
