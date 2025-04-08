import connectToDatabase from '@/server/lib/db'
import { User } from '../models/user'
import type { IUser, IUserDocument } from '../models/user'

export async function createOrUpdateUser(userData: IUser): Promise<IUserDocument> {
	await connectToDatabase()
	const existingUser = await findUserByTelegramId(userData.telegramId)

	if (existingUser) {
		Object.assign(existingUser, userData)
		return existingUser.save()
	}
	const createdUser = new User(userData)
	return createdUser.save()
}

export async function findUserByTelegramId(telegramId: number) {
    try {
        const user = await User.findOne({ telegramId });
        if (!user) {
            console.log(`User with telegramId ${telegramId} not found`);
            return null;
        }
        console.log('User found:', user);
        return user;
    } catch (error) {
        console.error('Error finding user by telegramId:', error);
        throw error;
    }
}