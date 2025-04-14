import {
  Controller,
  Post,
  Get,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BackupsService } from './backups.service';

@ApiTags('Backups')
@Controller('backups')
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get()
  async getBackups() {
    // TODO: before backup check Storacha is logged in or not
    // TODO: Get all backups from Storacha  and decode with secrets and return}

    try {
      const backup = await this.backupsService.createBackup();
      return {
        message: 'Backup created successfully',
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to create backup');
    }
  }

  @Post()
  async createBackup() {
    // TODO: upload backup from Storacha and  encrypt backup from  app secrets maintain in db
    // TODO: also update points in leaderboards
  }

  @Get('chats')
  async getChats() {
    // TODO: Get all chats from telegram
  }

  @Post()
  async restoreBackup() {}
}
