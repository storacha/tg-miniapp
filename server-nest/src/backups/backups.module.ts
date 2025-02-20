import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';

@Module({
  imports: [UsersModule],
  controllers: [BackupsController],
  providers: [BackupsService],
})
export class BackupsModule {}
