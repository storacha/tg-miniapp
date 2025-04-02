import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import connectToDatabase from '@/server/lib/mongodb'
import { Backup } from '@/server/models/backup'
import { uploadToStoracha, calculatePoints } from '@/server/lib/storacha'
import { updateUserPoints } from '@/server/lib/leaderboard'
import crypto from 'node:crypto'

export async function GET(request: NextRequest) {
	try {
		await connectToDatabase()

		const backups = await Backup.find().exec()

		return NextResponse.json(backups)
	} catch (error) {
		console.error('Error fetching backups:', error)
		return NextResponse.json({ success: false, message: 'Failed to fetch backups' }, { status: 500 })
	}
}

export async function POST(request: NextRequest) {
	try {
		await connectToDatabase()

		const body = await request.json()
		const { data, userId = 'test-user' } = body

		const dataSize = Buffer.byteLength(data, 'utf8')

		const filename = `backup-${crypto.randomUUID()}.json`
		const storachaCid = await uploadToStoracha(data, filename)

		const points = calculatePoints(dataSize)

		const backup = new Backup({
			backupId: crypto.randomUUID(),
			userId,
			data,
			createdAt: new Date(),
			size: dataSize,
			storachaCid,
			points,
		})

		await backup.save()

		await updateUserPoints(userId, points, dataSize)

		return NextResponse.json({
			success: true,
			message: 'Backup created successfully',
			backup,
			pointsAwarded: points,
		})
	} catch (error) {
		console.error('Error creating backup:', error)
		return NextResponse.json({ success: false, message: 'Failed to create backup' }, { status: 500 })
	}
}
