import { z } from 'zod';

export const TelegramAuthSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.string(), // Unix timestamp as string
  hash: z.string(),
});
