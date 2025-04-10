'use server'

import { NextRequest, NextResponse } from 'next/server';
import { parse, validate, isExpiredError } from '@telegram-apps/init-data-node';

import getConfig from '../lib/config'

/**
 * Validates the authorization of a request by checking the `Authorization` header
 * and verifying the user initialization data.
 *
 * This function ensures that the initialization data about the user who
 * launched the Mini App is signed by the Telegram bot. 
 * @param request 
 */
export function validateAuthorization(request: NextRequest) {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
        return NextResponse.json({ success: false, message: 'Authorization header missing' }, { status: 401 })
    }

    const config = getConfig()

    console.log(authHeader)
    const initDataRaw = authHeader.replace('tma ', '')

    try {
        validate(initDataRaw, config.TELEGRAM_BOT_TOKEN)
    } catch (error) {
        let message = 'Unauthorized'

        if (isExpiredError(error)) {
			message += ': authorization expired'
		}

        return NextResponse.json({ success: false, message }, { status: 401 })
    }

    const initData = parse(initDataRaw)
    const userId = initData.user?.id;

    if (!userId) {
        return NextResponse.json({ success: false, message: 'User ID not found in authorization data' }, { status: 401 });
    }

    const response = NextResponse.next()
    response.headers.set('x-user-id', userId.toString())

    return response
}