import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

function User() {
	return (
		<div className="flex justify-between active:bg-accent px-5 py-3">
			<div className="flex gap-4 items-center">
				<p className=" text-blue-600">#4</p>
				<Avatar>
					<AvatarImage src="https://github.com/shadcn.png" />
					<AvatarFallback>CN</AvatarFallback>
				</Avatar>
				<div>
					<h1 className="font-semibold text-foreground/80">Shadcn</h1>
					<p className="text-sm text-foreground/60">Theresa Webbs</p>
				</div>
			</div>
		</div>
	)
}

export default function Users() {
	return (
		<div className="flex flex-col py-10 bg-background h-full rounded-t-xl">
			<User />
			<User />
			<User />
		</div>
	)
}
