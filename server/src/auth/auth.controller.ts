import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TelegramAuthSchema } from './schemas/telegram-auth.schema';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import * as crypto from 'crypto';

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

import 'dotenv/config';

import { RequestOtpDto } from './dto/requestOtp.dto';
import { InitSessionQueryDto } from './dto/initSession.dto';
import { ValidateOtpDto } from './dto/validateOtp.dto';

const apiId: any = process.env.TELEGRAM_API_ID;
const apiHash = process.env.TELEGRAM_API_HASH;

const stringSession = new StringSession('');

@ApiTags('Authentication')
@Controller('session')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('init')
  async initSession(@Query() query: InitSessionQueryDto, @Res() res: any) {
    const isValidated = await this.authService.validateTelegramData(query);

    if (isValidated) {
      return res
        .status(HttpStatus.OK)
        .json({ success: true, message: 'User authenticated' });
    } else {
      return res
        .status(403)
        .json({ success: false, message: 'Authentication failed' });
    }

    // const client = new TelegramClient(stringSession, apiId, apiHash, {
    //   connectionRetries: 5,
    // });

    // await client.start({
    //   phoneNumber: () => null,
    //   phoneCode: () => null,
    //   password: () => null,
    //   onError: (err) => console.log({ err }),
    // });

    // // Create a new user or update existing one
    // const user = await this.usersService.createOrUpdate({
    //   telegramId: sessionId,
    //   firstName: 'Anonymous',
    //   authDate: new Date(),
    // });

    // // Generate a backup secret key
    // const backupSecretKey = crypto.randomBytes(32).toString('hex');

    // // Generate JWT token
    // const token = this.authService.generateToken(user);

    // return {
    //   user,
    //   token,
    //   backupSecretKey,
    // };
  }

  @Post('request-otp')
  async requestOtp(@Body() requestOtpDto: RequestOtpDto) {
    try {
      const { phoneNumber } = requestOtpDto;

      const result: any = await this.authService.requestOtp(phoneNumber);
      return {
        success: true,
        message: `OTP has been sent to ${phoneNumber}`,
        phoneCodeHash: result.phoneCodeHash,
      };
    } catch (err) {
      throw new BadRequestException('Failed to request OTP from Telegram');
    }
  }

  @Post('resend-otp')
  async resendOtp(@Body() resendOtpDto: any) {
    const { phoneNumber, phoneCodeHash } = resendOtpDto;

    try {
      const result: any = await this.authService.requestOtp(phoneNumber);
      return {
        success: true,
        message: `OTP has been sent to ${phoneNumber}`,
        phoneCodeHash: result.phoneCodeHash,
      };
    } catch (err) {
      throw new BadRequestException('Failed to resend OTP from Telegram');
    }
  }

  @Post('validate-otp')
  async validateOtp(@Body() validateOtpDto: ValidateOtpDto) {
    const { phoneNumber, phoneCodeHash, code } = validateOtpDto;

    try {
      const result: any = await this.authService.validateOtp(
        phoneNumber,
        phoneCodeHash,
        code,
      );

      return {
        success: true,
        message: 'OTP validated successfully',
        result,
      };
    } catch (err) {
      console.log({ err });
      throw new BadRequestException('Failed to validate OTP from Telegram');
    }
  }
}
