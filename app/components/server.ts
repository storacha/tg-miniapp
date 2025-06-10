'use server'

import { after } from 'next/server'
import {
  CreateJobRequest,
  DialogInfo,
  ExecuteJobRequest,
  Job,
  LeaderboardUser,
  Ranking,
} from '@/api'
import { getTelegramClient } from '@/lib/server/telegram-manager'
import { Api, TelegramClient } from 'telegram'
import { cleanUndef, decodeStrippedThumb, stringifyWithUIntArrays, toJPGDataURL } from '@/lib/utils'
import { getDB } from '@/lib/server/db'
import bigInt from 'big-integer'
import { toResultFn } from '@/lib/errorhandling'
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs'
import {
  login as jobsLoginJob,
  createJob as jobsCreateJob,
  findJob as jobsFindJob,
  listJobs as jobsListJob,
  removeJob as jobsRemoveJob,
} from '@/lib/server/jobs'
import { SpaceDID } from '@storacha/access'
import { toEntityData } from '@/lib/server/runner'
const queueURL = process.env.JOBS_QUEUE_ID

const localQueueFn = () => {
  return async (jr: ExecuteJobRequest) => {
    after(async () => {
      console.log('initiate job', jr.jobID)
      fetch(process.env.LOCAL_URL + '/api/jobs', {
        method: 'POST',
        body: JSON.stringify({ body: stringifyWithUIntArrays(jr) }),
      })
    })
  }
}

const sqsQueueFn = () => {
  console.debug('creating message for sqs queue id: ', queueURL)
  const client = new SQSClient({})

  return async (jr: ExecuteJobRequest) => {
    const command = new SendMessageCommand({
      QueueUrl: queueURL,
      MessageBody: stringifyWithUIntArrays(jr),
    })
    await client.send(command)
  }
}

const queueFn = queueURL ? sqsQueueFn() : localQueueFn()

export const login = toResultFn(jobsLoginJob)
export const createJob = toResultFn(
  async (jr: CreateJobRequest): Promise<Job> => jobsCreateJob(jr, queueFn)
)
export const findJob = toResultFn(jobsFindJob)
export const listJobs = toResultFn(jobsListJob)
export const removeJob = toResultFn(jobsRemoveJob)

const withClient = <T extends [...unknown[]], U>(
  fn: (client: TelegramClient, ...args: T) => Promise<U>
): ((sessionString: string, ...args: T) => Promise<U>) => {
  return async (sessionString: string, ...args: T) => {
    const client = await getTelegramClient(sessionString)

    if (!client.connected) {
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

export const listDialogs = toResultFn(
  withClient(
    async (
      client: TelegramClient,
      paginationParams: {
        limit: number
        offsetId?: number
        offsetDate?: number
        offsetPeer?: string
      }
    ) => {
      console.log('list dialogs with current params: ', paginationParams)

	const chats: DialogInfo[] = []
	let lastChat 
	for await (const chat of client.iterDialogs(paginationParams)){
		if (!chat.entity) {
			console.warn('skipping dialog without entity: ', chat)
			continue
		}

		const entityData = toEntityData(chat.entity) 
		const parts = entityData.name.replace(/[^a-zA-Z ]/ig, '').trim().split(' ')
		const initials = parts.length === 1 ?  entityData.name[0] : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
		const isPublic = chat.entity?.className === 'Channel' && !!chat.entity?.username ? true : false
		
		const info: DialogInfo = {
			...entityData,
			initials,
			isPublic,
			dialogId: chat.id?.toString(),
			accessHash: 'accessHash' in chat.entity ? chat.entity?.accessHash?.toString() : undefined
		}
		
		chats.push(cleanUndef(info))
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
        offsetParams,
      }
    }
  )
)

export const getLeaderboard = toResultFn(
  withClient(async (client: TelegramClient): Promise<LeaderboardUser[]> => {
    const dbUsers = await getDB().leaderboard()
    const telegramIDs = dbUsers.map((user) => bigInt(user.telegramId))
    const users = await client.invoke(
      new Api.users.GetUsers({
        id: telegramIDs,
      })
    )
    return dbUsers.map((dbUser, i): LeaderboardUser => {
      if (users[i].className == 'UserEmpty') {
        return {
          id: dbUser.id,
          name: 'missing user',
          initials: 'MU',
          thumbSrc: '',
          points: dbUser.points,
        }
      }
      const tgUser = users[i]
      const name = tgUser.lastName
        ? `${tgUser.firstName ? `${tgUser.firstName} ` : ''}${tgUser.lastName}`
        : tgUser.username || ''
      const parts = name
        .replace(/[^a-zA-Z ]/gi, '')
        .trim()
        .split(' ')
      const initials =
        parts.length === 1
          ? name[0]
          : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      let thumbSrc = ''
      // @ts-expect-error Telegram types are messed up
      const strippedThumbBytes = tgUser.photo?.strippedThumb
      if (strippedThumbBytes) {
        thumbSrc = toJPGDataURL(decodeStrippedThumb(strippedThumbBytes))
      }
      return {
        name,
        initials,
        thumbSrc,
        points: dbUser.points,
        id: dbUser.id,
      }
    })
  })
)

export const getRanking = toResultFn(
  withClient(
    async (
      client: TelegramClient,
      space: SpaceDID
    ): Promise<Ranking | undefined> => {
      const id = await _getMe(client)
      return await getDB().rank({ telegramId: id, storachaSpace: space })
    }
  )
)
