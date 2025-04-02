import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import connectToDatabase from '@/server/lib/mongodb'
import { validateTelegramData, createOrUpdateUser, generateToken } from '@/server/lib/auth'
import { InitSessionQuerySchema } from '@/server/lib/validation'

export async function POST(request: NextRequest) {
	try {
		await connectToDatabase()

		const searchParams = request.nextUrl.searchParams
		const query = Object.fromEntries(searchParams.entries())

		try {
			InitSessionQuerySchema.parse(query)
		} catch (error) {
			return NextResponse.json({ success: false, message: 'Invalid request data' }, { status: 400 })
		}

		const isValidated = await validateTelegramData(query)

		if (isValidated) {
			return NextResponse.json({ success: true, message: 'User authenticated' }, { status: 200 })
		}
		return NextResponse.json({ success: false, message: 'Authentication failed' }, { status: 403 })
	} catch (error) {
		console.error('Error in session init:', error)
		return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
	}
}
