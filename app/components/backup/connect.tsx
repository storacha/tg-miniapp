import { useW3 as useStoracha } from '@storacha/ui-react'
import { email as parseEmail } from '@storacha/did-mailto'
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle
} from '@/components/ui/drawer'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { FormEventHandler, useState } from 'react'
import { useGlobal } from '@/zustand/global'
import { useTelegram } from '@/providers/telegram'

const spaceNamePrefix = 'Telegram Backups'
export interface ConnectProps {
	open: boolean
	email: string
	onEmailChange: (value: string) => unknown
	onSubmit: () => unknown
	onDismiss?: () => void
}

export function Connect({ open, email, onEmailChange, onSubmit, onDismiss}: ConnectProps) {
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
	onDismiss?: () => void
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
						<DrawerDescription className="mb-5">Click the link in the email we sent to <span className='font-semibold tracking-wide'>{email}</span> to authorize this agent.</DrawerDescription>
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

export const StorachaConnect = ({ open, onDismiss }: { open: boolean, onDismiss?: () => void  }) => {
	const [{ user }] = useTelegram()
	const [{ client }] = useStoracha()
	const { setIsStorachaAuthorized, setSpace } = useGlobal()

	const [email, setEmail] = useState('')
	const [connErr, setConnErr] = useState<Error>()
	const [verifying, setVerifying] = useState(false)
	
	const handleConnectSubmit = async () => {
		try {
			if (!client) throw new Error('missing Storacha client instance')
			setConnErr(undefined)
			setVerifying(true)

			const spaceName = `${spaceNamePrefix} (${user?.id})`
			const account = await client.login(parseEmail(email))
			const space = client.spaces().find(s => s.name === spaceName)
			if (space) {
				await client.setCurrentSpace(space.did())
				setSpace(space.did())
			} else {
				await account.plan.wait()
				const space = await client.createSpace(spaceName, { account })
				await client.setCurrentSpace(space.did())
				setSpace(space.did())
			}
			setIsStorachaAuthorized(true)
		} catch (err) {
			console.error(err)
			setConnErr(err as Error)
		} finally {
			setVerifying(false)
		}
	}

  if (open && connErr) {
    return (
      <ConnectError
        open={true}
        error={connErr}
		onDismiss={() => {
		  setConnErr(undefined)
		  if (onDismiss) onDismiss()
		}}
      />
    )
  }

  if (open && verifying) {
    return (
      <Verify
        open={true}
        email={email}
		onDismiss={onDismiss}
      />
    )
  }

  return (
    <Connect
      open={open}
      email={email}
      onEmailChange={setEmail}
      onSubmit={handleConnectSubmit}
	  onDismiss={onDismiss}
    />
  )
}