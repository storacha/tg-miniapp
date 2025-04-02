import mongoose, { Schema } from 'mongoose'
import type { Document, Model } from 'mongoose'

export interface IBackup {
	backupId: string
	userId: string
	data: string
	createdAt: Date
	restoredAt?: Date
	size: number // Size in bytes
	storachaCid?: string // Content ID from Storacha
	points: number // Points awarded for this backup
}

export interface IBackupDocument extends IBackup, Document {}

const BackupSchema = new Schema<IBackupDocument>({
	backupId: { type: String, required: true, unique: true },
	userId: { type: String, required: true },
	data: { type: String, required: true },
	createdAt: { type: Date, required: true },
	restoredAt: { type: Date },
	size: { type: Number, required: true, default: 0 },
	storachaCid: { type: String },
	points: { type: Number, default: 0 },
})

export const Backup: Model<IBackupDocument> =
	(mongoose.models.Backup as Model<IBackupDocument>) || mongoose.model<IBackupDocument>('Backup', BackupSchema)
