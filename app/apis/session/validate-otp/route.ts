import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import connectToDatabase from '@/server/lib/mongodb'
import { validateOtp } from '@/server/lib/telegram'
import { ValidateOtpDtoSchema } from '@/server/lib/validation'

export async function POST(request: NextRequest) {
	try {
		await connectToDatabase()

		const body = await request.json()

		try {
			ValidateOtpDtoSchema.parse(body)
		} catch (error) {
			return NextResponse.json({ success: false, message: 'Invalid request data' }, { status: 400 })
		}

		const { phoneNumber, phoneCodeHash, code } = body

		const result = await validateOtp(phoneNumber, phoneCodeHash, code)

		return NextResponse.json({
			success: true,
			message: 'OTP validated successfully',
			result,
		})
	} catch (error) {
		console.error('Error in validate OTP:', error)
		return NextResponse.json({ success: false, message: 'Failed to validate OTP from Telegram' }, { status: 400 })
	}
}
