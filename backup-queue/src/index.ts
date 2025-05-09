import type { BackupRequest, Env, BackupJob } from './types'
import { BackupStatus } from './types'

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url)

		if (request.method === 'OPTIONS') {
			return handleCors()
		}

		if (url.pathname === '/api/backup' && request.method === 'POST') {
			return handleBackupRequest(request, env, ctx)
		}

		return new Response('Not found', { status: 404 })
	},

	async queue(batch: MessageBatch<BackupJob>, env: Env): Promise<void> {
		for (const message of batch.messages) {
			const job = message.body
			try {
				console.info(`Processing backup job ${job.backupId} for chat ${job.chatId}`)
				//TODO: Forward the backup job to another worker for processing with a maximum TTL
			} catch (error) {
				console.error(`Error processing backup job ${job.backupId}:`, error)
			}
		}
	},
}

async function handleBackupRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	try {
		const data = (await request.json()) as BackupRequest
		if (!data.chatId || !data.userId) {
			return new Response(JSON.stringify({ error: 'Missing required fields' }), {
				status: 400,
				headers: corsHeaders(),
			})
		}

		const backupId = crypto.randomUUID()

		await env.BACKUP_QUEUE.send({
			backupId,
			chatId: data.chatId,
			userId: data.userId,
			timestamp: new Date().toISOString(),
		})

		return new Response(
			JSON.stringify({
				backupId,
				status: BackupStatus.PENDING,
				message: 'Backup job queued successfully',
			}),
			{
				status: 200,
				headers: corsHeaders(),
			},
		)
	} catch (error) {
		console.error('Error processing backup request:', error)
		return new Response(JSON.stringify({ error: 'Failed to process backup request' }), {
			status: 500,
			headers: corsHeaders(),
		})
	}
}

function handleCors(): Response {
	return new Response(null, {
		status: 204,
		headers: corsHeaders(),
	})
}

function corsHeaders(): HeadersInit {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Content-Type': 'application/json',
	}
}
