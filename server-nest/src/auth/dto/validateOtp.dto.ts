import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const validateOtpDtoSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
});

export class ValidateOtpDto {
  @ApiProperty({
    description: 'The phone number to which the OTP will be sent',
    example: '+1234567890',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'The phone code hash',
    example: '1234567890',
  })
  phoneCodeHash: string;

  @ApiProperty({
    description: 'The code',
    example: '123456',
  })
  code: string;
}

export type ValidateOtpDtoType = z.infer<typeof validateOtpDtoSchema>;
