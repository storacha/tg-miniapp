import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import * as StorachaService from '@/server/services/storachaService';

/**
 * TODO:
 * Change this to properly handle the authorization.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const { account, proof } = body

        await StorachaService.authorizeServer(account, proof)

        return NextResponse.json({
            success: true,
            message: 'Add Authorization successfully',
        })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Error in validate OTP:', error)
        return NextResponse.json({ success: false, message: 'Failed to validate OTP from Telegram', reason: error?.errorMessage }, { status: 400 })
    }
}
