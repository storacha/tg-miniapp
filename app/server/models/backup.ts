import mongoose, { Schema, Types, Document, Model } from 'mongoose';

export interface IBackup {
    userId: Types.ObjectId
    space: string
    cid: string
    size: number
    points: number
}

export interface IBackupDocument extends IBackup, Document {}

const BackupSchema = new Schema<IBackupDocument>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        space: { type: String, required: true },
        cid: { type: String, required: true },
        size: { type: Number, required: true },
        points: { type: Number, default: 0 },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // createdAt will be automatically managed by Mongoose
    }
)

export const Backup: Model<IBackupDocument> =
    (mongoose.models.Backup as Model<IBackupDocument>) || mongoose.model<IBackupDocument>('Backup', BackupSchema)