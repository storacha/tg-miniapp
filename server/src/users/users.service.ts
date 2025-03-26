import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByTelegramId(telegramId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ telegramId }).exec();
  }

  async createOrUpdate(userData: {
    telegramId: string;
    firstName: string;
    lastName?: string;
    username?: string;
    photoUrl?: string;
    authDate: Date;
  }): Promise<UserDocument> {
    const existingUser = await this.findByTelegramId(userData.telegramId);
    if (existingUser) {
      // Update existing user fields
      Object.assign(existingUser, userData);
      return existingUser.save();
    } else {
      // Create a new user
      const createdUser = new this.userModel(userData);
      return createdUser.save();
    }
  }
}
