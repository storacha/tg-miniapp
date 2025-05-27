'use server'

import { create as createJobServer } from '@/lib/server/server'
import Queue from 'p-queue'
import { CreateJobRequest, DialogInfo, ExecuteJobRequest, FindJobRequest, Job, LeaderboardUser, ListJobsRequest, Ranking, RemoveJobRequest } from '@/api'
import { getTelegramClient } from '@/lib/server/telegram-manager'
import { Api, TelegramClient } from 'telegram'
import { decodeStrippedThumb, stringifyWithUIntArrays, toJPGDataURL } from '@/lib/utils'
import { getEntityType } from '@/lib/backup/utils'
import { getDB } from '@/lib/server/db'
import bigInt from 'big-integer'
import { toResultFn } from '@/lib/errorhandling'
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs'

const queueURL = process.env.JOBS_QUEUE_ID

const localQueueFn = () => {
	const queue = new Queue({concurrency: 1})
	return (jr: ExecuteJobRequest) => {
      return queue.add(async () => {
        await server.handleJob(jr)
      })
    }
}

const sqsQueueFn = () => {
	console.debug("creating message for sqs queue id: ", queueURL)
	const client = new SQSClient({})

	return async (jr: ExecuteJobRequest) => {
		const command = new SendMessageCommand({
    	QueueUrl: queueURL,
    	MessageBody: stringifyWithUIntArrays(jr)
  	});
		await client.send(command)
	}
}

const server = await createJobServer({
    queueFn: queueURL ? sqsQueueFn() : localQueueFn()
})

export const createJob = toResultFn(async (jr: CreateJobRequest) : Promise<Job> => server.createJob(jr))
export const findJob = toResultFn(async (jr: FindJobRequest) : Promise<Job> => server.findJob(jr))
export const listJobs = toResultFn(async (jr: ListJobsRequest) : Promise<Job[]> => server.listJobs(jr))
export const removeJob = toResultFn(async (jr: RemoveJobRequest) : Promise<Job> => server.removeJob(jr))
// end TODO

const withClient =  <T extends [...unknown[]], U>(fn: (client: TelegramClient, ...args: T) => Promise<U>) : ((sessionString: string, ...args: T) => Promise<U>) => {
	return async (sessionString: string, ...args: T) => {
		const client = await getTelegramClient(sessionString)

		if(!client.connected){
			await client.connect()
		}
		try {
			return await fn(client, ...args)
		} finally {
			client.disconnect()
		}
	}
}

const _getMe = async (client: TelegramClient) => {
	const user = await client.getMe()
	return user.id.toString()
}

export const getMe = toResultFn(withClient(_getMe))

export const listDialogs = toResultFn(withClient(async (client: TelegramClient, paginationParams: { limit: number, offsetId?: number, offsetDate?: number, offsetPeer?: string}) => {
	
	console.log('list dialogs with current params: ', paginationParams)

	const chats: DialogInfo[] = []
	let lastChat 
	for await (const chat of client.iterDialogs(paginationParams)){
		const title = (chat.name ?? chat.title ?? '').trim() || 'Unknown'
		const parts = title.replace(/[^a-zA-Z ]/ig, '').trim().split(' ')
		const initials = parts.length === 1 ? title[0] : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()

		let thumbSrc = ''
		// @ts-expect-error Telegram types are messed up
		const strippedThumbBytes = chat.entity?.photo?.strippedThumb
		if (strippedThumbBytes) {
			thumbSrc = toJPGDataURL(decodeStrippedThumb(strippedThumbBytes))
		}

		const isPublic = chat.entity?.className === 'Channel' && !!chat.entity.username ? true : false

		const type = chat.entity ? getEntityType(chat.entity) : 'unknown'

		chats.push({
			id: chat.id?.toString(),
			title,
			initials,
			thumbSrc,
			isPublic,
			type,
			entityId: chat.entity?.id.toString(),
		})
		lastChat = chat
	}
	
	const lastMessage = lastChat?.message
	const offsetId = lastMessage ? lastMessage.id : 0
	const offsetDate = lastMessage ? lastMessage.date : 0
	// @ts-expect-error the check is happening later
	const offsetPeerUsername = lastChat?.entity?.username
	const peer = String(lastChat?.id)

	const offsetParams = {
		offsetId,
		offsetDate,
		offsetPeer: offsetPeerUsername ?? peer,
	}

	console.log('total dialogs: ', chats.length)
	console.log('first dialog: ', chats[0])
	console.log('last dialog: ', chats[chats.length - 1])
	console.log('next params: ', offsetParams)
	
	return {
		chats,
		offsetParams
	}

}))

export const getLeaderboard = toResultFn(withClient(async (client: TelegramClient) : Promise<LeaderboardUser[]> => {
	const dbUsers = await getDB().leaderboard()
	const telegramIDs = dbUsers.map(user => bigInt(user.telegramId))
	const users = await client.invoke(new Api.users.GetUsers({
    id: telegramIDs,
  }))
	return dbUsers.map((dbUser, i) : LeaderboardUser => {
		if (users[i].className == "UserEmpty") {
			return {
				id: dbUser.id,
				name: "missing user",
				initials: "MU",
				thumbSrc: "",
				points: dbUser.points,
			}
		}
		const tgUser = users[i]
		const name = tgUser.lastName ? `${tgUser.firstName ? `${tgUser.firstName} `: ""}${tgUser.lastName}` : tgUser.username || ""
		const parts = name.replace(/[^a-zA-Z ]/ig, '').trim().split(' ')
		const initials = parts.length === 1 ? name[0] : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
		let thumbSrc = ''
		// @ts-expect-error Telegram types are messed up
		const strippedThumbBytes = tgUser.photo?.strippedThumb
		if (strippedThumbBytes) {
			thumbSrc = toJPGDataURL(decodeStrippedThumb(strippedThumbBytes))
		}
		return {
			name, initials, thumbSrc, points: dbUser.points, id: dbUser.id
		}
	})
}))

export const getRanking = toResultFn(withClient(async (client: TelegramClient) : Promise<Ranking | undefined> => {
	const id = await _getMe(client)
	return await getDB().rank(BigInt(id))
}))
