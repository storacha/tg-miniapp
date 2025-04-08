import { Api, TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import getConfig from '../lib/config'
import * as Cache from '../lib/cache'
import { IUser } from '../models/user'
import * as UserService from './userService'
import * as StorachaService from './storachaService'

const config = getConfig()

export async function getTelegramClient(userId: string) {
	try {
		const sessionToken = await Cache.getSession(userId)

		let sessionString: StringSession
		if (sessionToken){
			sessionString = new StringSession(sessionToken)
		}else{
			const sessionToken = '' // get the session from DB
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
	} catch (err) {
		console.error('Error getting Telegram client:', err)
		throw err
	}
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

		const user = await UserService.createOrUpdateUser(userInfo)
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
		throw err
	} finally{
		await client.disconnect()
	}
}

export async function getChatMessages(userId: string, chatId: string, startDate?: number, lastDate?: number){
	const client = await getTelegramClient(userId)

	try {
		const firstMessage = (await client.getMessages(chatId, {
			limit: 1,
			offsetDate: startDate,
		}))[0]
	
		const allMessages = await client.getMessages(chatId, {
			offsetDate: lastDate,
			minId: firstMessage.id,
		})
	
		// OBS.: If we need to parse the message, use this:
		// const messages = []
		// for await (const message of client.iterMessages(chatId, {
		// 	offsetDate: lastDate,
		// 	minId: firstMessage.id,
		// })){
		// 	// console.log(`text: ${message.text}, date: ${message.date}, id: ${message.id}`)
		// 	messages.push(message)
		// }

		return allMessages
	} catch (err) {
		console.error('Error fetching chat messages:', err)
		throw err
	} finally{
		await client.disconnect()
	}
}


export async function backupUserChats(userId: string, backupUserChatsDto: any) {
	try {
		const chatToMessages: Record<string, any[]> = {}
		const { chatIds, startDate, lastDate } = backupUserChatsDto

		for (const chat of chatIds) {
			console.log(`Fetching messages for chat: ${chat}`)
			const messages = await getChatMessages(userId, chat, startDate,lastDate)
			console.log(`Fetched ${messages.length} messages for chat: ${chat}`)
			chatToMessages[chat] = messages
		}

		console.log('Uploading to Storacha...')
		const {cid, points} = await StorachaService.uploadToStoracha(userId, JSON.stringify(chatToMessages))

		return {points, cid}
	} catch (err) {
		console.error('Error backing up chats:', err)
		throw new Error('Failed to backup chats')
	} 
}
