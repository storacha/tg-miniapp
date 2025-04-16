export interface BackupRequest {
	userId: string
	chatId: string
	options?: {
		includeMedia?: boolean
		dateRange?: {
			start: string
			end: string
		}
	}
}

export enum BackupStatus {
	PENDING = 'pending',
	PROCESSING = 'processing',
	SUCCESS = 'success',
	FAILED = 'failed',
}

export interface Env {
	BACKUP_QUEUE: Queue
}

export interface BackupJob {
	backupId: string
	chatId: string
	userId: string
	timestamp: string
}
