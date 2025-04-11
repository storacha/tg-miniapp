import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@/components/ui/drawer'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { FormEventHandler } from 'react'

export interface ConnectProps {
	open: boolean
	email: string
	onEmailChange: (value: string) => unknown
	onSubmit: () => unknown
	onDismiss: () => unknown
}

export function Connect({ open, email, onEmailChange, onSubmit, onDismiss }: ConnectProps) {
	const handleSubmit: FormEventHandler = e => {
		e.preventDefault()
		onSubmit()
	}
	return (
		<Drawer open={open} onClose={onDismiss}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Connect Your Storacha Account</DrawerTitle>
					<DrawerDescription>You need to connect your Storacha account to back up your chats.</DrawerDescription>
				</DrawerHeader>
				<DrawerFooter>
					<form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-10">
						<Input type="email" value={email} placeholder="Enter your email" onChange={e => onEmailChange(e.target.value)} />
						<Button type="submit" disabled={!email}>Connect Now</Button>
						<p className="text-xs text-muted-foreground italic text-center">
							By registering with storacha.network, you agree to the storacha.network <a className="underline" href="https://docs.storacha.network/terms/" target="_blank">Terms of Service</a>.
						</p>
					</form>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	)
}

export interface VerifyProps {
	open: boolean
	email: string
	onDismiss: () => unknown
}

export const Verify = ({ open, email, onDismiss }: VerifyProps) => {
	return (
		<Drawer open={open} onClose={onDismiss}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Verify your email address</DrawerTitle>
				</DrawerHeader>
				<DrawerFooter>
					<div className="text-center">
						<img src="/spinner.png" width="100" className="inline-block animate-[spin_3s_linear_infinite] mb-5" />
						<DrawerDescription>Click the link in the email we sent to <span className='font-semibold tracking-wide'>{email}</span> to authorize this agent.</DrawerDescription>
					</div>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	)
}

export interface ConnectErrorProps {
	open: boolean
	error?: Error
	onDismiss: () => unknown
}

export const ConnectError = ({ open, error, onDismiss }: ConnectErrorProps) => {
	return (
		<Drawer open={open} onClose={onDismiss}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Oops!</DrawerTitle>
				</DrawerHeader>
				<DrawerFooter>
					<div className="text-center pb-5">
						<img src="/fail-racha.png" width="112" className="inline-block mb-5" />
						<p className="text-red-600 text-center">Error: {error?.message ?? 'A connection error occured.'}</p>
					</div>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	)
}
