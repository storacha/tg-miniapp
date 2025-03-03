import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TelegramAuthSchema } from './schemas/telegram-auth.schema';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import * as crypto from 'crypto';

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

const apiId = '';
const apiHash = '';

const stringSession = new StringSession('');

@ApiTags('Authentication')
@Controller('session')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('request-otp')
  async requestOtp(@Body() requestOtpDto: any) {
    try {
      const { phoneNumber } = requestOtpDto;

      const result = await this.authService.requestOtp(phoneNumber);
      return {
        success: true,
        message: `OTP has been sent to ${phoneNumber}`,
        phoneCodeHash: result.phoneCodeHash,
      };
    } catch (err) {
      throw new BadRequestException('Failed to request OTP from Telegram');
    }
  }

  @Post('init')
  async initSession(@Body('sessionId') sessionId: string) {
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.start({
      phoneNumber: () => '',
      phoneCode: () => '',
      password: () => '',
      onError: (err) => console.log({ err }),
    });

    // Create a new user or update existing one
    const user = await this.usersService.createOrUpdate({
      telegramId: sessionId,
      firstName: 'Anonymous',
      authDate: new Date(),
    });

    // Generate a backup secret key
    const backupSecretKey = crypto.randomBytes(32).toString('hex');

    // Generate JWT token
    const token = this.authService.generateToken(user);

    return {
      user,
      token,
      backupSecretKey,
    };
  }

  @Post('request')
  async requestSession() {
    try {
      // Simulating a request to Telegram API
      const response = await fetch(
        'https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ timeout: 0, offset: -1 }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to request Telegram session');
      }

      const data = await response.json();

      if (data.ok) {
        return {
          success: true,
          message: 'Telegram session requested successfully',
          data: data.result,
        };
      } else {
        return {
          success: false,
          message: 'Failed to request Telegram session',
        };
      }
    } catch (error) {
      console.error('Error requesting Telegram session:', error);
      return {
        success: false,
        message: 'An error occurred while requesting Telegram session',
      };
    }
  }

  @Post('validate')
  @ApiResponse({ status: 200, description: 'Authentication successful.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid Telegram authentication data.',
  })
  async telegramAuth(
    @Body(new ZodValidationPipe(TelegramAuthSchema))
    authData: {
      id: string;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      auth_date: string;
      hash: string;
    },
  ) {
    // TODO: Validate Tg session with otp and return user that have session loggedIn
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new BadRequestException('Telegram Bot Token is not configured');
    }

    // Validate Telegram payload using our auth service logic.
    const isValid = this.authService.validateTelegramAuth(authData, botToken);
    if (!isValid) {
      throw new BadRequestException('Invalid Telegram authentication data.');
    }

    // Convert the auth_date (Unix timestamp in seconds) to a Date object.
    const authDate = new Date(parseInt(authData.auth_date, 10) * 1000);

    // Create or update the user in the database.
    const user = await this.usersService.createOrUpdate({
      telegramId: authData.id,
      firstName: authData.first_name,
      lastName: authData.last_name,
      username: authData.username,
      photoUrl: authData.photo_url,
      authDate,
    });

    // ...

    // Generate a JWT token here; for demonstration, we return a dummy token.
    const token = this.authService.generateToken(user);

    return { message: 'Authentication successful', token, user };
  }
}
