import { backupUserChats } from '@/server/services/telegramService'
import { BackupChatsDtoSchema } from '@/server/lib/validation'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

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

export async function POST(request: NextRequest) {
	try {
		const userId = request.headers.get('x-user-id')! // validation is done in middleware

		const body = await request.json()
		
		try {
			BackupChatsDtoSchema.parse(body)
		} catch (error) {
			return NextResponse.json({ success: false, message: 'Invalid request data' }, { status: 400 })
		}

		const result = await backupUserChats(userId, body)

		return NextResponse.json({
			success: true,
			message: 'Backup process started successfully',
			result
		})
	} catch (error) {
		console.error('Backup failed:', error)
		return NextResponse.json({ success: false, message: 'Failed to backup chats' }, { status: 500 })
	}
}