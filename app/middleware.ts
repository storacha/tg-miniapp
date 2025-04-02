import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cors } from '@/server/middleware/cors'

export function middleware(request: NextRequest) {
	const corsResponse = cors(request)

	return corsResponse
}

export const config = {
	matcher: '/api/:path*',
}
