import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import getConfig from '../lib/config'

export function cors(request: NextRequest) {
	const config = getConfig()

	const origin = request.headers.get('origin') || ''

	const allowedOrigin = config.CLIENT_URL === '*' ? origin : config.CLIENT_URL

	const response = NextResponse.next()

	response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
	response.headers.set('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
	response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
	response.headers.set('Access-Control-Allow-Credentials', 'true')

	return response
}
