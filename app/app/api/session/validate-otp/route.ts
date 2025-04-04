import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { parse } from '@telegram-apps/init-data-node';

import { validateOtp } from '@/server/lib/telegram'
import { ValidateOtpDtoSchema } from '@/server/lib/validation'
import { IUser } from '@/server/models/user';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()

		try {
			ValidateOtpDtoSchema.parse(body)
		} catch (error) {
			return NextResponse.json({ success: false, message: 'Invalid request data' }, { status: 400 })
		}

		const { phoneNumber, phoneCodeHash, code } = body

		const userData = parseUserDataFromRequest(request)
		const result = await validateOtp(phoneNumber, phoneCodeHash, code, userData)

		return NextResponse.json({
			success: true,
			message: 'OTP validated successfully',
			result,
		})
	} catch (error: any) {
		console.error('Error in validate OTP:', error)
		return NextResponse.json({ success: false, message: 'Failed to validate OTP from Telegram', reason: error?.errorMessage }, { status: 400 })
	}
}

function parseUserDataFromRequest(request: NextRequest): IUser {
	const authHeader = request.headers.get('Authorization')! // validation is done in middleware
	const initDataRaw = authHeader.replace('tma ', '')
	const initData = parse(initDataRaw)
	const user = initData.user!

	return {
		telegramId: user.id,
		firstName: user.first_name,
		lastName: user.last_name,
		username: user.username,
		photoUrl: user.photo_url,
		authDate: initData.auth_date
	}
}
