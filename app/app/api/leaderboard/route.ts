import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import connectToDatabase from '@/server/lib/db'
import { getLeaderboard, getUserRank } from '@/server/services/leaderboardService'

export async function GET(request: NextRequest) {
	try {
		await connectToDatabase()

		const searchParams = request.nextUrl.searchParams
		const limit = Number.parseInt(searchParams.get('limit') || '10', 10)
		const skip = Number.parseInt(searchParams.get('skip') || '0', 10)
		const userId = searchParams.get('userId')

		if (userId) {
			const rank = await getUserRank(userId)
			if (!rank) {
				return NextResponse.json({ success: false, message: 'User not found in leaderboard' }, { status: 404 })
			}
			return NextResponse.json({ rank })
		}

		const leaderboard = await getLeaderboard(limit, skip)

		return NextResponse.json(leaderboard)
	} catch (error) {
		console.error('Error fetching leaderboard:', error)
		return NextResponse.json({ success: false, message: 'Failed to fetch leaderboard' }, { status: 500 })
	}
}
