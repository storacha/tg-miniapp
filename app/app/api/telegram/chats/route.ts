import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listUserChats } from '@/server/lib/telegram'

export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')! // validation is done in middleware
        const searchParams = request.nextUrl.searchParams
        const limit = Number(searchParams.get('limit')) || 3
        const offsetId = Number(searchParams.get('offsetId')) || 0
        const offsetDate = Number(searchParams.get('offsetDate')) || null

        const chats = await listUserChats(userId, { limit, offsetId })

        return NextResponse.json({ success: true, chats })
    } catch (error) {
        console.error('Error fetching Telegram chats:', error)
        return NextResponse.json({ success: false, message: 'Failed to fetch Telegram chats' }, { status: 500 })
    }
} 
