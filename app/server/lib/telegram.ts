import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { Api } from 'telegram'
import getConfig from './config'

const config = getConfig()

let client: TelegramClient | null = null

export async function getTelegramClient() {
	if (!client) {
		const stringSession = new StringSession('')
		client = new TelegramClient(stringSession, Number.parseInt(config.TELEGRAM_API_ID, 10), config.TELEGRAM_API_HASH, {
			connectionRetries: 5,
		})

		await client.connect()
	}

	return client
}

export async function requestOtp(phoneNumber: string) {
	const client = await getTelegramClient()

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

export async function validateOtp(phoneNumber: string, phoneCodeHash: string, code: string) {
	const client = await getTelegramClient()

	const result = await client.invoke(
		new Api.auth.SignIn({
			phoneNumber,
			phoneCode: code,
			phoneCodeHash,
		}),
	)

	return result
}
