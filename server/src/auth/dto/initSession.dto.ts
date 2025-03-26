import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const InitSessionQuerySchema = z.object({
  id: z.string().nonempty(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.string().nonempty(),
  hash: z.string().nonempty(),
});

export class InitSessionQueryDto {
  @ApiProperty({
    description: 'The unique identifier for the user',
    example: '123456789',
  })
  id: string;

  @ApiProperty({
    description: 'The first name of the user',
    example: 'John',
    required: false,
  })
  first_name?: string;

  @ApiProperty({
    description: 'The last name of the user',
    example: 'Doe',
    required: false,
  })
  last_name?: string;

  @ApiProperty({
    description: 'The username of the user',
    example: 'johndoe',
    required: false,
  })
  username?: string;

  @ApiProperty({
    description: 'The photo URL of the user',
    example: 'https://example.com/photo.jpg',
    required: false,
  })
  photo_url?: string;

  @ApiProperty({
    description: 'The authentication date',
    example: '1633036800',
  })
  auth_date: string;

  @ApiProperty({
    description: 'The hash for authentication verification',
    example: 'abcdef1234567890',
  })
  hash: string;
}

export type InitSessionQueryDtoType = z.infer<typeof InitSessionQuerySchema>;
