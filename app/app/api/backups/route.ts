import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { BackupChatsDtoSchema } from '@/server/lib/validation'
import * as BackupService from '@/server/services/backupService'
import * as TelegramService from '@/server/services/telegramService'

export async function GET(request: NextRequest) {
	try {
		const userId = request.headers.get('x-user-id')! // validation is done in middleware

		const result = await BackupService.listUserBackups(userId)

		return NextResponse.json({
			success: true,
			message: 'Backup list retrieved successfully',
			result
		})
	} catch (error) {
		console.error('Error fetching backups:', error)
		return NextResponse.json({ success: false, message: 'Failed to fetch backups' }, { status: 500 })
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

		const result = await TelegramService.backupUserChats(userId, body)

		return NextResponse.json({
			success: true,
			message: 'Backup process started successfully',
			result
		})
	} catch (error) {
		console.error('Backup failed:', error)
		return NextResponse.json({ success: false, message: 'Failed to create backup' }, { status: 500 })
	}
}
