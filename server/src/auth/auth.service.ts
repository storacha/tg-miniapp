import { Injectable } from '@nestjs/common'
import * as crypto from 'node:crypto'
import * as jwt from 'passport-jwt'
import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions'
import 'dotenv/config'

@Injectable()
export class AuthService {
	/**
	 * Validates the Telegram authentication payload.
	 * @param authData Validated Telegram authentication data.
	 * @param botToken Your Telegram bot token.
	 * @returns True if the payload is valid; false otherwise.
	 */

	private client: TelegramClient
	private stringSession: StringSession
	private apiId: number
	private apiHash: string

	constructor() {
		this.apiId = Number.parseInt(process.env.TELEGRAM_API_ID as string, 10)
		this.apiHash = process.env.TELEGRAM_API_HASH as string
		this.stringSession = new StringSession('')
		this.client = new TelegramClient(this.stringSession, this.apiId, this.apiHash, {
			connectionRetries: 5,
		})
	}

	async validateTelegramData(query: Record<string, any>): Promise<boolean> {
		const secretKey = crypto
			.createHash('sha256')
			.update(process.env.TELEGRAM_BOT_TOKEN as string)
			.digest()

		const receivedHash = query.hash
		delete query.hash

		const dataCheckString = Object.keys(query)
			.sort()
			.map((key) => `${key}=${query[key]}`)
			.join('\n')

		const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

		return computedHash === receivedHash
	}

	async connect() {
		if (this.client.disconnected) {
			await this.client.connect()
		}
	}

	async requestOtp(phoneNumber: string) {
		await this.connect()
		try {
			const sendCodeResult = await this.client.sendCode(
				{ apiHash: process.env.TELEGRAM_API_HASH, apiId: Number.parseInt(process.env.TELEGRAM_API_ID as string) },
				phoneNumber,
			) // Updated method to sendCode
			return sendCodeResult // Return the result of the sendCode operation
		} catch (err) {
			console.error('Error sending OTP:', err) // Handle error by logging it
			throw new Error('Failed to send OTP') // Throw a new error for further handling
		}
	}

	async validateOtp(phoneNumber: string, phoneCodeHash: string, code: string) {
		await this.connect()
		const result = await this.client.invoke(
			new Api.auth.SignIn({
				phoneNumber,
				phoneCode: code,
				phoneCodeHash,
			}),
		)
		return result
	}

	getSessionString() {
		return this.client.session.save()
	}

	validateTelegramAuth(
		authData: {
			id: string
			first_name: string
			last_name?: string
			username?: string
			photo_url?: string
			auth_date: string
			hash: string
		},
		botToken: string,
	): boolean {
		// Destructure to separate the hash
		const { hash, ...data } = authData

		// Create an array of key=value strings for available properties
		const dataCheckArr = []
		if (data.auth_date) dataCheckArr.push(`auth_date=${data.auth_date}`)
		if (data.first_name) dataCheckArr.push(`first_name=${data.first_name}`)
		if (data.id) dataCheckArr.push(`id=${data.id}`)
		if (data.last_name) dataCheckArr.push(`last_name=${data.last_name}`)
		if (data.photo_url) dataCheckArr.push(`photo_url=${data.photo_url}`)
		if (data.username) dataCheckArr.push(`username=${data.username}`)

		// Sort alphabetically and join with newline characters
		const dataCheckString = dataCheckArr.sort().join('\n')

		// Generate secret key from bot token using SHA-256
		const secretKey = crypto.createHash('sha256').update(botToken).digest()

		// Compute HMAC hash for the dataCheckString
		const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

		return computedHash === hash
	}

	generateToken(user: any) {
		const payload = {
			userId: user._id, // Replace with actual user ID
			timestamp: Date.now(),
		}
		const secretKey = process.env.SESSION_SECRET // Replace with a secure secret key

		return jwt.sign(payload, secretKey, { expiresIn: '1h' })
	}
}
