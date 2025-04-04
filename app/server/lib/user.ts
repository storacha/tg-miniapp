import connectToDatabase from '@/server/lib/mongodb'
import { User } from '../models/user'
import type { IUser, IUserDocument } from '../models/user'

export async function createOrUpdateUser(userData: IUser): Promise<IUserDocument> {
	await connectToDatabase()
	const existingUser = await User.findOne({ telegramId: userData.telegramId }).exec()

	if (existingUser) {
		Object.assign(existingUser, userData)
		return existingUser.save()
	}
	const createdUser = new User(userData)
	return createdUser.save()
}