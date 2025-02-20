import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true, unique: true })
  telegramId: string;

  @Prop({ required: true })
  firstName: string;

  @Prop()
  lastName?: string;

  @Prop()
  username?: string;

  @Prop()
  photoUrl?: string;

  @Prop({ required: true })
  authDate: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
