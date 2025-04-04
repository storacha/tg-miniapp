import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cors } from '@/server/middleware/cors'
import { validateAuthorization } from '@/server/middleware/authMiddleware'

export function middleware(request: NextRequest) {
	const headers = new Headers(request.headers)
	headers.delete('x-user-id');

	const corsResponse = cors(request)

	if (!corsResponse.ok){
		return corsResponse
	}

	const isAuthorized = validateAuthorization(request)
	if(!isAuthorized.ok) {
		return isAuthorized
	}

	const response = NextResponse.next({request: { headers }});
    corsResponse.headers.forEach((value, key) => response.headers.set(key, value));
    isAuthorized.headers.forEach((value, key) => response.headers.set(key, value));

    return response;
}

export const config = {
	matcher: '/api/:path*',
	runtime: 'nodejs', // this is an experimental feature, will need to investigate a better way to handle this
}
