import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BackupDocument = Backup & Document;

@Schema()
export class Backup {
  @Prop({ required: true, unique: true })
  backupId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  data: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop()
  restoredAt?: Date;
}

export const BackupSchema = SchemaFactory.createForClass(Backup);
