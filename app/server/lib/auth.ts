import * as crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import getConfig from './config'
import { User } from '../models/user'
import type { IUserDocument } from '../models/user'

const config = getConfig()

export async function validateTelegramData(query: Record<string, any>): Promise<boolean> {
	const secretKey = crypto.createHash('sha256').update(config.TELEGRAM_BOT_TOKEN).digest()

	const receivedHash = query.hash
	delete query.hash

	const dataCheckString = Object.keys(query)
		.sort()
		.map((key) => `${key}=${query[key]}`)
		.join('\n')

	const computedHash = crypto.createHmac('sha256', secretKey.toString('utf8')).update(dataCheckString).digest('hex')

	return computedHash === receivedHash
}

export function generateToken(user: IUserDocument) {
	const payload = {
		userId: user._id,
		timestamp: Date.now(),
	}

	return jwt.sign(payload, config.SESSION_SECRET, { expiresIn: '1h' })
}
