import { Api, TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import getConfig from './config'
import { IUser } from '../models/user'
import { createOrUpdateUser } from './user'
import * as Cache from './cache'

const config = getConfig()

export async function getTelegramClient(userId: string) {
	const sessionToken = await Cache.getSession(userId)

	let sessionString: StringSession
	if (sessionToken){
		sessionString = new StringSession(sessionToken)
	}else{
		// get the session from DB
		sessionString = new StringSession('')
	}

	const client = new TelegramClient(
		sessionString, 
		Number.parseInt(config.TELEGRAM_API_ID, 10), 
		config.TELEGRAM_API_HASH, 
		{ connectionRetries: 5 }
	)

	await client.connect()

	return client
}  

export async function requestOtp(userId: string, phoneNumber: string) {
	const client = await getTelegramClient(userId)

	try {
		const sendCodeResult = await client.sendCode(
			{
				apiHash: config.TELEGRAM_API_HASH,
				apiId: Number.parseInt(config.TELEGRAM_API_ID, 10),
			},
			phoneNumber,
		)

		return sendCodeResult
	} catch (err) {
		console.error('Error sending OTP:', err)
		throw new Error('Failed to send OTP')
	}
}

export async function validateOtp(phoneNumber: string, phoneCodeHash: string, code: string, userData: IUser) {
	const client = await getTelegramClient(String(userData.telegramId))

	const result = await client.invoke(
		new Api.auth.SignIn({
			phoneNumber,
			phoneCode: code,
			phoneCodeHash,
		}),
	)

	// TODO: check if the result contain information about the user

	// TODO: Save user data to the database
	const user = createOrUpdateUser(userData)

	return result
}

export async function listUserChats(userId: string) {
	const client = await getTelegramClient(userId)

	try {
		const result = await client.getDialogs({
			limit: 100,
		})

		return result
	} catch (err) {
		console.error('Error fetching chats:', err)
		throw new Error('Failed to fetch chats')
	}
}