'use client'

import type { PropsWithChildren } from 'react'
// import { initData, useLaunchParams, useSignal } from '@telegram-apps/sdk-react'
import { useDidMount } from '../hooks/useDidMount'
import { ErrorBoundary } from './error-boundary'
import { ErrorPage } from './error-page'
// import { useClientOnce } from '../hooks/useClientOnce'
// import { init } from '../utils/core'
import LogoSplash from './svgs/logo-splash'

// function RootInner({ children }: PropsWithChildren) {
// 	const isDev = process.env.NODE_ENV === 'development'

// 	if (isDev) {
// 		// eslint-disable-next-line react-hooks/rules-of-hooks
// 		// useTelegramMock()
// 	}

// 	const lp = useLaunchParams()
// 	const debug = isDev || lp.startParam === 'debug'

// 	useClientOnce(() => {
// 		init(debug)
// 	})

// 	const initDataUser = useSignal(initData.user)
// 	// console.log('initDataUser', initDataUser)
// 	//TODO: Add Global Context Provider
// 	return <div>{children}</div>
// }

export function Root(props: PropsWithChildren) {
	const didMount = useDidMount()

	return didMount ? (
		<ErrorBoundary fallback={ErrorPage}>
			<div {...props} />
			{/* <RootInner {...props} /> */}
		</ErrorBoundary>
	) : (
		<div className="h-screen flex justify-center items-center bg-primary">
			<LogoSplash />
		</div>
	)
}
