import mongoose, { Schema } from 'mongoose'
import type { Document, Model } from 'mongoose'

export interface ILeaderboard {
	userId: string
	username?: string
	displayName: string
	points: number
	totalUploads: number
	totalSize: number // in bytes
	lastUpdated: Date
}

export interface ILeaderboardDocument extends ILeaderboard, Document {}

const LeaderboardSchema = new Schema<ILeaderboardDocument>({
	userId: { type: String, required: true, unique: true },
	username: { type: String },
	displayName: { type: String, required: true },
	points: { type: Number, required: true, default: 0 },
	totalUploads: { type: Number, required: true, default: 0 },
	totalSize: { type: Number, required: true, default: 0 },
	lastUpdated: { type: Date, required: true, default: Date.now },
})

export const Leaderboard: Model<ILeaderboardDocument> =
	mongoose.models.Leaderboard || mongoose.model<ILeaderboardDocument>('Leaderboard', LeaderboardSchema)
