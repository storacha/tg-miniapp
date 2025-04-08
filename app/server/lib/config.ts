import { z } from 'zod'

export const configSchema = z.object({
	NODE_ENV: z.string().refine((value) => ['development', 'production', 'staging'].includes(value)),
	PORT: z.coerce.number().positive(),
	MONGODB_URI: z.string().url().min(1),
	TELEGRAM_API_ID: z.string().min(1),
	TELEGRAM_API_HASH: z.string().min(1),
	TELEGRAM_BOT_TOKEN: z.string().min(1),
	SESSION_SECRET: z.string().min(1),
	CLIENT_URL: z.string(),
	STORACHA_EMAIL: z.string().email().optional(),
	STORACHA_SPACE_DID: z.string().optional(),
	SERVER_PRINCIPAL: z.string(),
	POINTS_PER_BYTE: z.coerce.number().positive().default(10),
	ENCRYPT_KEY: z.string().min(10),
	SALT: z.string().min(10),
})

export type Config = z.infer<typeof configSchema>

export function getConfig(): Config {
	try {
		return configSchema.parse({
			NODE_ENV: process.env.NODE_ENV,
			PORT: process.env.PORT,
			MONGODB_URI: process.env.MONGODB_URI,
			TELEGRAM_API_ID: process.env.TELEGRAM_API_ID,
			TELEGRAM_API_HASH: process.env.TELEGRAM_API_HASH,
			TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
			SESSION_SECRET: process.env.SESSION_SECRET,
			CLIENT_URL: process.env.CLIENT_URL,
			STORACHA_EMAIL: process.env.STORACHA_EMAIL,
			STORACHA_SPACE_DID: process.env.STORACHA_SPACE_DID,
			SERVER_PRINCIPAL: process.env.SERVER_PRINCIPAL,
			ENCRYPT_KEY: process.env.ENCRYPT_KEY,
			SALT: process.env.SALT,
		})
	} catch (error) {
		console.error('Invalid environment variables:', error)
		throw new Error('Invalid environment configuration')
	}
}

export default getConfig
