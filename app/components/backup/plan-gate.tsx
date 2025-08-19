'use client'

import { useW3 as useStoracha } from '@storacha/ui-react'
import { base64url } from 'multiformats/bases/base64'
import { authorize } from '@storacha/capabilities/access'
import { Button } from '../ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { openLink } from '@telegram-apps/sdk-react'

export function PlanGate({
  open,
  onSubmit,
  onDismiss,
}: {
  open: boolean
  onSubmit: () => unknown
  onDismiss?: () => void
}) {
  return (
    <Drawer open={open} onClose={onDismiss}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Almost there!</DrawerTitle>
          <DrawerDescription>
            To unlock free storage and back up your Telegram chats, we just need
            to verify you&apos;re human.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <p className="text-xs text-muted-foreground text-center">
            This quick face check takes seconds — no account, no credit card,{' '}
            <strong>and no biometric data is stored. Ever.</strong>
          </p>
          <HumanodeAuthLink className="text-center" onClick={onSubmit} />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

export function HumanodeAuthLink({
  onClick,
  className,
}: {
  className?: string
  onClick?: () => void
}) {
  const [{ accounts, client }] = useStoracha()
  const account = accounts[0]

  async function onClickNotABot() {
    if (!client)
      throw new Error(
        'Storacha client not defined, cannot create authorization link.'
      )
    // Create an access/authorize request that can be used as the state of the OAuth request.
    const request = await authorize.delegate({
      audience: client.agent.connection.id,
      issuer: client.agent.issuer,
      // agent that should be granted access
      with: client.agent.did(),
      // capabilities requested (account access)
      nb: {
        iss: account.did(),
        att: [
          {
            can: '*',
          },
        ],
      },
      // expire this after 15 minutes
      expiration: Math.floor(Date.now() / 1000) + 60 * 15,
    })
    const archive = await request.archive()
    if (archive?.ok) {
      const state = base64url.encode(archive.ok)
      const link = `${process.env.NEXT_PUBLIC_HUMANODE_AUTH_URL}?response_type=code&client_id=${process.env.NEXT_PUBLIC_HUMANODE_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_HUMANODE_OAUTH_CALLBACK_URL}&scope=openid&state=${state}`
      openLink(link)
      if (onClick) onClick()
    } else {
      console.error('Could not create auth delegation.', archive.error)
    }
  }

  return (
    <Button type="button" className={className} onClick={onClickNotABot}>
      Show I&apos;m Not a Bot
    </Button>
  )
}
