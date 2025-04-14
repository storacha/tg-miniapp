import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listUserChats } from '@/server/services/telegramService'

/**
 * TODO:
 * - Add "last backup" date to each chat
 * - Add "isPublicGroup"
 * - Add "isPrivateGroup"
 */

export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')! // validation is done in middleware
        const searchParams = request.nextUrl.searchParams
        const limit = Number(searchParams.get('limit')) || 15
        const offsetId = searchParams.get('offsetId')
        const offsetDate = searchParams.get('offsetDate')
        const offsetPeer = searchParams.get('offsetPeer')

        const offsetParams = {
            limit,
           ...(offsetId && { offsetId: Number(offsetId) }),
           ...(offsetDate && { offsetDate: Number(offsetDate) }),
           ...(offsetPeer && { offsetPeer: offsetPeer }),
        }

        const response = await listUserChats(userId, offsetParams)

        return NextResponse.json({ success: true, response })
    } catch (error) {
        console.error('Error fetching Telegram chats:', error)
        return NextResponse.json({ success: false, message: 'Failed to fetch Telegram chats' }, { status: 500 })
    }
} 
