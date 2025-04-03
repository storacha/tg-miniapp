import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cors } from '@/server/middleware/cors'
import { validateAuthorization } from '@/server/middleware/authMiddleware'

export function middleware(request: NextRequest) {
	const corsResponse = cors(request)

	const valid = validateAuthorization(request)
	if(!valid?.ok) {
		return valid
	}

	return corsResponse
}

export const config = {
	matcher: '/api/:path*',
	runtime: 'nodejs', // this is an experimental feature, will need to investigate a better way to handle this
}
