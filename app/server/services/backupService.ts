import { Backup } from '@/server/models/backup';
import * as UserService from './userService';

interface RegisterBackupDto {
    userTelegramId: number
    space: string
    cid: string
    size: number
    points?: number
}

/**
 * Registers a new backup for a user.
 * @param backupData - The data required to create a backup.
 * @returns The created backup document.
 * @throws Error if the user does not exist or if the backup creation fails.
 */
export async function registerBackup(backupData: RegisterBackupDto) {
    const { userTelegramId, space, cid, size, points} = backupData

    const user = await UserService.findUserByTelegramId(userTelegramId);
    if (!user) {
        throw new Error(`User with telegram ID ${userTelegramId} does not exist`)
    }

    const backup = new Backup({
        userId: user._id,
        space,
        cid,
        size,
        points,
    })

    await backup.save()
    return backup;
}