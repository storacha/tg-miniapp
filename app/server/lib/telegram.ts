import { Api, TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import getConfig from './config'
import { IUser } from '../models/user'
import { createOrUpdateUser } from './user'
import * as Cache from './cache'
import { on } from 'events'

const config = getConfig()

export async function getTelegramClient(userId: string) {
	const sessionToken = await Cache.getSession(userId)

	let sessionString: StringSession
	if (sessionToken){
		sessionString = new StringSession(sessionToken)
	}else{
		const sessionToken = '1AQAOMTQ5LjE1NC4xNzUuNTMBu7yAY1mGvN5mWhiAZeimGHNLkjjvqJhPCY9F6YnO7Xg7igLSyo0ERk/M/xoAgLM8sVkzn4X+E7LFhFv45WeHwH/uGMhvC+HwXNcUlW7zBtN2nv5glSO4dTnAgshR11xHv697zC0TrIpW1qRkPAWwi6Nx4d84SQXbGZEq6jlDybe3cjRRpcCsBvt+/yykqydu5Uhq3RQSj22ODGHZVnkbFDBmprq5x2r5CHohl8U6GPkrvAQ4EOh+gOIODgVd42T5CzpHShR6R3Hnmo5g5w+tqN0SrUoABL/5fEo6nRTwK5dATucMnoSEXj+oW8I75UDUTwLrdum33q1y/+G03NaW53M=' // get the session from DB
		Cache.setSession(userId, sessionToken)
		sessionString = new StringSession(sessionToken)
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
		const tempSessionToken = client.session.save()
		Cache.setSession(userId, tempSessionToken)
		// console.debug('Temporary session string:', tempSessionToken)
		console.log('phoneCodeHash:', sendCodeResult.phoneCodeHash)
		return sendCodeResult
	} catch (err) {
		console.error('Error sending OTP:', err)
		throw err
	} finally{
		await client.disconnect()
	}
}

export async function validateOtp(phoneNumber: string, phoneCodeHash: string, code: string, userData: IUser) {
	const client = await getTelegramClient(String(userData.telegramId))

	try {
		const result = await client.invoke(
			new Api.auth.SignIn({
				phoneNumber,
				phoneCode: code,
				phoneCodeHash,
			}),
		)

		const sessionToken = String(client.session.save())
		Cache.setSession(String(userData.telegramId), sessionToken)
		console.log('Session string:', sessionToken)

		const parsedResult = result.toJSON()

		let userInfo = {
			...userData,
			sessionToken
		}

		// @ts-ignore Typescript doesn't know that parsedResult has a user property
		if(parsedResult.user){
			// @ts-ignore
			userInfo['isBot'] = parsedResult.user.bot
		}

		const user = await createOrUpdateUser(userInfo)
		console.log('User created or updated:', user._id)

		return result
	} catch (err) {
		console.error('Error validating OTP:', err)
		throw err
	} finally{
		await client.disconnect()
	}
}

export async function listUserChats(userId: string, paginationParams: { limit: number, offsetId: number, offsetDate: number, offsetPeer?: string}) {
	const client = await getTelegramClient(userId)

	try {
		let chats = []
		let lastChat 
		for await (const chat of client.iterDialogs(paginationParams)){
			chats.push({
				id: chat.id?.toString(),
				title: chat.title,
				telegramId: chat.entity?.id.toString(),
				// @ts-ignore
				photo: chat.entity?.photo?.strippedThumb,
			})
			lastChat = chat
		}
		
		const lastMessage = lastChat?.message
		const offsetId = lastMessage ? lastMessage.id : 0
		const offsetDate = lastMessage ? lastMessage.date : 0
		// @ts-ignore
		const offsetPeerUsername = lastChat?.entity.username
		const peer = String(lastChat?.id)

		const offsetParams = {
			offsetId,
			offsetDate,
			offsetPeer: offsetPeerUsername ?? peer,
		}

		return {
			chats,
			offsetParams
		}
	} catch (err) {
		console.error('Error fetching chats:', err)
		throw new Error('Failed to fetch chats')
	} finally{
		await client.disconnect()
	}
}
