import { z } from 'zod'

export const TelegramAuthSchema = z.object({
	id: z.string(),
	first_name: z.string(),
	last_name: z.string().optional(),
	username: z.string().optional(),
	photo_url: z.string().optional(),
	auth_date: z.string(), // Unix timestamp as string
	hash: z.string(),
})

export const InitSessionQuerySchema = z.object({
	id: z.string().nonempty(),
	first_name: z.string().optional(),
	last_name: z.string().optional(),
	username: z.string().optional(),
	photo_url: z.string().optional(),
	auth_date: z.string().nonempty(),
	hash: z.string().nonempty(),
})

export const RequestOtpDtoSchema = z.object({
	phoneNumber: z
		.string()
		.min(1, 'Phone number is required')
		.regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
})

export const ValidateOtpDtoSchema = z.object({
	phoneNumber: z
		.string()
		.min(1, 'Phone number is required')
		.regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
	phoneCodeHash: z.string(),
	code: z.string(),
})
