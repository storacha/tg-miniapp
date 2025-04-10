import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import * as BackupService from '@/server/services/backupService'

export async function GET(request: NextRequest) {
	try {
		const userId = request.headers.get('x-user-id')! // validation is done in middleware
		const body = await request.json()
		
		// const response = await BackupService.retrieveBackup(userId, body.cid)

		return NextResponse.json({
			chats: [], // Placeholder for actual chat data
		})
	} catch (error) {
		console.error('Error fetching chats:', error)
		return NextResponse.json({ success: false, message: 'Failed to fetch chats' }, { status: 500 })
	}
}

