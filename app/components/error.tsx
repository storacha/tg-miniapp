'use client'
import { useEffect } from 'react'

export function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset?: () => void
}) {
	useEffect(() => {
		console.error(error)
	}, [error])

	return (
		<div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-white">
			<img
				src="/fail-racha.png"
				width="112"
				alt="Error"
				className="inline-block mb-5"
			/>

			<h2 className="text-xl font-semibold text-red-600 mb-4">
				An unexpected error occurred
			</h2>

			<blockquote className="bg-red-100 text-red-800 text-sm p-4 rounded w-full max-w-md break-words mb-6">
				<code>{error.message}</code>
			</blockquote>

			<button
				type="button"
				className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded w-full max-w-xs"
				onClick={() => (reset ? reset() : window.location.reload())}
			>
				{reset ? 'Try Again' : 'Reload Page'}
			</button>
		</div>
	)
}
