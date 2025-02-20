import { z } from 'zod';

export const configurationSchema = z.object({
  NODE_ENV: z
    .string()
    .refine((value) =>
      ['development', 'production', 'staging'].includes(value),
    ),
  PORT: z.coerce.number().positive(),
  SWAGGER_PATH: z.string().min(1),
  MONGODB_URI: z.string().url().min(1),
});
