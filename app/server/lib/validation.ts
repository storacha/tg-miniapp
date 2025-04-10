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

export const BackupChatsDtoSchema = z.object({
	chatIds: z.array(z.string()).nonempty('At least one chat ID is required'),
	startDate: z
		.number()
		.optional()
		.refine((timestamp) => !timestamp || (timestamp > 0 && timestamp <= 9999999999), {
			message: 'startDate must be a positive number in seconds',
		}),
	lastDate: z
		.number()
		.optional()
		.refine((timestamp) => !timestamp || (timestamp > 0 && timestamp <= 9999999999), {
			message: 'lastDate must be a positive number in seconds',
		}),
}).refine(
	(data) => !data.startDate || !data.lastDate || data.startDate < data.lastDate,
	{
		message: 'startDate must be smaller than lastDate',
		path: ['startDate', 'lastDate'],
	}
)
