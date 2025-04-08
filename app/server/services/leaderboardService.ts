import { Leaderboard } from '../models/leaderboard'
import type { ILeaderboardDocument } from '../models/leaderboard'
import { User } from '../models/user'
import connectToDatabase from '../lib/db'

export async function updateUserPoints(
	userId: string,
	pointsToAdd: number,
	uploadSize: number,
): Promise<ILeaderboardDocument> {
	await connectToDatabase()

	const user = await User.findOne({ telegramId: userId }).exec()
	if (!user) {
		throw new Error(`User with ID ${userId} not found`)
	}

	let leaderboard = await Leaderboard.findOne({ userId }).exec()

	if (!leaderboard) {
		leaderboard = new Leaderboard({
			userId,
			username: user.username,
			displayName: `${user.firstName} ${user.lastName || ''}`.trim(),
			points: 0,
			totalUploads: 0,
			totalSize: 0,
			lastUpdated: new Date(),
		})
	}

	leaderboard.points += pointsToAdd
	leaderboard.totalUploads += 1
	leaderboard.totalSize += uploadSize
	leaderboard.lastUpdated = new Date()

	return leaderboard.save()
}

export async function getLeaderboard(limit = 10, skip = 0): Promise<ILeaderboardDocument[]> {
	await connectToDatabase()

	return Leaderboard.find()
		.sort({ points: -1 }) // Sort by points descending
		.skip(skip)
		.limit(limit)
		.exec()
}

export async function getUserRank(userId: string): Promise<number | null> {
	await connectToDatabase()

	const user = await Leaderboard.findOne({ userId }).exec()
	if (!user) return null

	const higherRanked = await Leaderboard.countDocuments({ points: { $gt: user.points } })
	return higherRanked + 1 // Add 1 to get rank (1-based)
}
