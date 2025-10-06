'use client'

import { PropsWithChildren } from 'react'
import { useDidMount } from '../hooks/useDidMount'
import LogoSplash from './svgs/logo-splash'
import { Root } from './root'
import { AppOpenedTracker } from './AppOpenedTracker'

export function RootLoader(props: PropsWithChildren) {
  const didMount = useDidMount()

  if (!didMount) {
    return (
      <div className="h-screen flex justify-center items-center bg-primary">
        <LogoSplash />
      </div>
    )
  }

  return (
    <Root>
      {props.children}
      <AppOpenedTracker />
    </Root>
  )
}
