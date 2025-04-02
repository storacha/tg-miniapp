import mongoose, { Schema } from 'mongoose'
import type { Document, Model } from 'mongoose'

export interface IUser {
	telegramId: string
	firstName: string
	lastName?: string
	username?: string
	photoUrl?: string
	authDate: Date
}

export interface IUserDocument extends IUser, Document {}

const UserSchema = new Schema<IUserDocument>({
	telegramId: { type: String, required: true, unique: true },
	firstName: { type: String, required: true },
	lastName: { type: String },
	username: { type: String },
	photoUrl: { type: String },
	authDate: { type: Date, required: true },
})

export const User: Model<IUserDocument> = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema)
