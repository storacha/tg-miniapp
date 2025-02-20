import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as jwt from 'passport-jwt';

@Injectable()
export class AuthService {
  /**
   * Validates the Telegram authentication payload.
   * @param authData Validated Telegram authentication data.
   * @param botToken Your Telegram bot token.
   * @returns True if the payload is valid; false otherwise.
   */
  validateTelegramAuth(
    authData: {
      id: string;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      auth_date: string;
      hash: string;
    },
    botToken: string,
  ): boolean {
    // Destructure to separate the hash
    const { hash, ...data } = authData;

    // Create an array of key=value strings for available properties
    const dataCheckArr = [];
    if (data.auth_date) dataCheckArr.push(`auth_date=${data.auth_date}`);
    if (data.first_name) dataCheckArr.push(`first_name=${data.first_name}`);
    if (data.id) dataCheckArr.push(`id=${data.id}`);
    if (data.last_name) dataCheckArr.push(`last_name=${data.last_name}`);
    if (data.photo_url) dataCheckArr.push(`photo_url=${data.photo_url}`);
    if (data.username) dataCheckArr.push(`username=${data.username}`);

    // Sort alphabetically and join with newline characters
    const dataCheckString = dataCheckArr.sort().join('\n');

    // Generate secret key from bot token using SHA-256
    const secretKey = crypto.createHash('sha256').update(botToken).digest();

    // Compute HMAC hash for the dataCheckString
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return computedHash === hash;
  }

  generateToken(user) {
    const payload = {
      userId: user._id, // Replace with actual user ID
      timestamp: Date.now(),
    };
    const secretKey = process.env.SESSION_SECRET; // Replace with a secure secret key

    return jwt.sign(payload, secretKey, { expiresIn: '1h' });
  }
}
