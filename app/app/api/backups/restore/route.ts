import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
	try {
		return NextResponse.json({
			chats: [], // Placeholder for actual chat data
		})
	} catch (error) {
		console.error('Error fetching chats:', error)
		return NextResponse.json({ success: false, message: 'Failed to fetch chats' }, { status: 500 })
	}
}

