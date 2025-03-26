import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const requestOtpDtoSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
});

export class RequestOtpDto {
  @ApiProperty({
    description: 'The phone number to which the OTP will be sent',
    example: '+1234567890',
  })
  phoneNumber: string;
}

export type RequestOtpDtoType = z.infer<typeof requestOtpDtoSchema>;
