import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requestOtp } from '@/server/lib/telegram'
import { RequestOtpDtoSchema } from '@/server/lib/validation'

export async function POST(request: NextRequest) {
	try {
		const userId = request.headers.get('x-user-id')! // validation is done in middleware

		const body = await request.json()

		try {
			RequestOtpDtoSchema.parse(body)
		} catch (error) {
			return NextResponse.json({ success: false, message: 'Invalid request data' }, { status: 400 })
		}

		const { phoneNumber } = body

		const result = await requestOtp(userId, phoneNumber)

		return NextResponse.json({
			success: true,
			message: `OTP has been sent to ${phoneNumber}`,
			phoneCodeHash: result.phoneCodeHash,
		})
	} catch (error) {
		console.error('Error in request OTP:', error)
		return NextResponse.json({ success: false, message: 'Failed to request OTP from Telegram' }, { status: 400 })
	}
}
