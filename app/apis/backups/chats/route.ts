import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import connectToDatabase from '@/server/lib/mongodb'

export async function GET(request: NextRequest) {
	try {
		await connectToDatabase()

		return NextResponse.json({
			chats: [], // Placeholder for actual chat data
		})
	} catch (error) {
		console.error('Error fetching chats:', error)
		return NextResponse.json({ success: false, message: 'Failed to fetch chats' }, { status: 500 })
	}
}
