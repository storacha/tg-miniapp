'use client'

import type { PropsWithChildren } from 'react'
import { useDidMount } from '../hooks/useDidMount'
import { ErrorBoundary } from './error-boundary'
import { ErrorPage } from './error-page'
import LogoSplash from './svgs/logo-splash'
import { Provider as TelegramProvider } from '@/providers/telegram'
import { init, restoreInitData } from '@telegram-apps/sdk-react'

const apiId = parseInt(process.env.NEXT_PUBLIC_TELEGRAM_API_ID ?? '')
const apiHash = process.env.NEXT_PUBLIC_TELEGRAM_API_HASH ?? ''

// Initialize telegram react SDK
if (typeof window !== 'undefined') {
	init()
	restoreInitData()
}

export function Root(props: PropsWithChildren) {
	const didMount = useDidMount()

	return didMount ? (
		<ErrorBoundary fallback={ErrorPage}>
			<TelegramProvider apiId={apiId} apiHash={apiHash}>
				<div {...props} />
			</TelegramProvider>
		</ErrorBoundary>
	) : (
		<div className="h-screen flex justify-center items-center bg-primary">
			<LogoSplash />
		</div>
	)
}
