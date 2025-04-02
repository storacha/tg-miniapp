import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import connectToDatabase from '@/server/lib/mongodb'
import { requestOtp } from '@/server/lib/telegram'
import { RequestOtpDtoSchema } from '@/server/lib/validation'

export async function POST(request: NextRequest) {
	try {
		await connectToDatabase()

		const body = await request.json()

		try {
			RequestOtpDtoSchema.parse(body)
		} catch (error) {
			return NextResponse.json({ success: false, message: 'Invalid request data' }, { status: 400 })
		}

		const { phoneNumber } = body

		const result = await requestOtp(phoneNumber)

		return NextResponse.json({
			success: true,
			message: `OTP has been resent to ${phoneNumber}`,
			phoneCodeHash: result.phoneCodeHash,
		})
	} catch (error) {
		console.error('Error in resend OTP:', error)
		return NextResponse.json({ success: false, message: 'Failed to resend OTP from Telegram' }, { status: 400 })
	}
}
