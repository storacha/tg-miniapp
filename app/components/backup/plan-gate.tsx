'use client'

import { useEffect, useState } from 'react'
import { useW3 as useStoracha } from '@storacha/ui-react'
import { base64url } from 'multiformats/bases/base64'
import { authorize } from '@storacha/capabilities/access';
import { Button } from '../ui/button';
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle
} from '@/components/ui/drawer'

export function PlanGate ({ open, onSubmit, onDismiss }: { open: boolean; onSubmit: () => unknown;
	onDismiss?: () => void }) {

  return (
    <Drawer open={open} onClose={onDismiss}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Welcome!</DrawerTitle>
          <DrawerDescription> 
            To back up your Telegram chats, you need a Storacha subscription.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
            <p className="text-xs text-muted-foreground text-center">
              Or, prove you&apos;re human to get free storage, no credit card required!
            </p>
            <HumanodeAuthLink className="text-center" onClick={onSubmit}/>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

export function HumanodeAuthLink ({ onClick, className }: { className?: string; onClick?: () => void }) {
  const [state, setState] = useState<string>()
  const [{ accounts, client }] = useStoracha()
  const account = accounts[0]
  const link = `${process.env.NEXT_PUBLIC_HUMANODE_AUTH_URL}?response_type=code&client_id=${process.env.NEXT_PUBLIC_HUMANODE_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_HUMANODE_OAUTH_CALLBACK_URL}&scope=openid&state=${state}`

  useEffect(() => {
    (async () => {
      if (client) {
        console.log('delegation parameters: ', {
          audience: client.agent.connection.id,
          issuer: client.agent.issuer,
          // agent that should be granted access
          with: client.agent.did(),
          // capabilities requested (account access)
          nb: {
            iss: account.did(),
            att: [{ 
              can: '*',
            }]
          },
          // expire this after 15 minutes
          expiration:  Math.floor(Date.now() / 1000) + 60 * 15
        })
        // Create an access/authorize request that can be used as the state of the OAuth request.
        const request = await authorize.delegate({
          audience: client.agent.connection.id,
          issuer: client.agent.issuer,
          // agent that should be granted access
          with: client.agent.did(),
          // capabilities requested (account access)
          nb: {
            iss: account.did(),
            att: [{ 
              can: '*',
            }]
          },
          // expire this after 15 minutes
          expiration:  Math.floor(Date.now() / 1000) + 60 * 15
        })
        const archive = await request.archive()
        if (archive?.ok) {
          setState(base64url.encode(archive.ok))
        } else {
          console.warn('could not create auth delegation')
        }
      }
    })()
  }, [client, account])

 

  return (
    <Button asChild type="button" className={className}>
      <a href={link} target="_blank" rel="noopener noreferrer" onClick={onClick}>
        Prove my Humanity!
      </a>
    </Button>
  )
}
