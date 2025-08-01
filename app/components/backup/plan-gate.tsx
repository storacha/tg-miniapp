'use client'

import { useEffect, useState } from 'react'
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
  const [state, setState] = useState<string>()
  const [{ accounts, client }] = useStoracha()
  const account = accounts[0]
  const link = `${process.env.NEXT_PUBLIC_HUMANODE_AUTH_URL}?response_type=code&client_id=${process.env.NEXT_PUBLIC_HUMANODE_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_HUMANODE_OAUTH_CALLBACK_URL}&scope=openid&state=${state}`

  useEffect(() => {
    ;(async () => {
      if (client) {
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
          setState(base64url.encode(archive.ok))
        } else {
          console.warn('Could not create auth delegation.', archive.error)
        }
      }
    })()
  }, [client, account])

  return (
    <Button asChild type="button" className={className}>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
      >
        Show I&apos;m Not a Bot
      </a>
    </Button>
  )
}
