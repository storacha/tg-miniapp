import { Injectable } from '@nestjs/common';

@Injectable()
export class BackupsService {
  constructor() {}

  createBackup() {
    //
    // Create a new backup
    const backup = {
      createdAt: new Date(),
    };

    // TODO: Save the backup to a persistent storage

    return backup;
  }

  restoreBackup() {}

  getChats() {}
}
