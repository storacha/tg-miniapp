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
import { TelegramClient, Api } from 'telegram'
import { cleanUndef, getInitials, stringifyWithUIntArrays } from '@/lib/utils'
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
  cancelJob as jobsCancelJob,
  deleteDialogFromJob as jobsDeleteDialogFromJob,
} from '@/lib/server/jobs'
import { SpaceDID } from '@storacha/access'
import { toEntityData } from '@/lib/server/runner'
import { getThumbSrc } from '@/lib/backup/utils'
import supervillains from '@/lib/supervillains.json'
import { clearSession } from '@/lib/server/session'

const names = supervillains
  .map((value) => ({ value, sort: Math.random() }))
  .sort((a, b) => a.sort - b.sort)
  .map(({ value }) => value)

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
export const cancelJob = toResultFn(jobsCancelJob)
export const deleteDialogFromJob = toResultFn(jobsDeleteDialogFromJob)

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

export const logout = toResultFn(
  withClient(async (client: TelegramClient) => {
    clearSession()
    console.log('logging out from telegram client..')
    await client.invoke(new Api.auth.LogOut())
    console.log('logged out from telegram client')
  })
)

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
      for await (const chat of client.iterDialogs(paginationParams)) {
        if (!chat.entity) {
          console.warn('skipping dialog without entity: ', chat)
          continue
        }

        const entityData = toEntityData(chat.entity)
        const initials = getInitials(entityData.name)
        const isPublic =
          chat.entity?.className === 'Channel' && !!chat.entity?.username
            ? true
            : false

        const info: DialogInfo = {
          ...entityData,
          initials,
          isPublic,
          dialogId: chat.id?.toString(),
          accessHash:
            'accessHash' in chat.entity
              ? chat.entity?.accessHash?.toString()
              : undefined,
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
    const [dbUsers, me] = await Promise.all([
      getDB().leaderboard(),
      client.getMe(),
    ])
    const leaderboard: LeaderboardUser[] = []
    let nameIndex = 0
    for (let i = 0; i < dbUsers.length; i++) {
      const id = dbUsers[i].telegramId
      let name
      let thumbSrc = ''
      if (i < 3) {
        try {
          const tgUser =
            id === me.id.toString() ? me : await client.getEntity(bigInt(id))
          if (tgUser.className !== 'User') {
            throw new Error(`${tgUser.className} is not a User`)
          }
          name =
            [tgUser.firstName, tgUser.lastName].filter((s) => !!s).join(' ') ||
            tgUser.username ||
            ''
          thumbSrc = getThumbSrc(
            tgUser.photo?.className === 'UserProfilePhoto' &&
              tgUser.photo.strippedThumb
              ? new Uint8Array(tgUser.photo.strippedThumb)
              : undefined
          )
        } catch (err) {
          if (err instanceof Error) {
            console.warn(`failed to get leaderboard user: ${err.message}`)
          } else {
            console.log(`failed to get leaderboard user: `, err)
          }
        }
      }
      if (!name) {
        name = names[nameIndex]
        nameIndex++
      }

      leaderboard.push({
        id,
        name,
        initials: getInitials(name),
        thumbSrc,
        points: dbUsers[i].points,
        isMe: id === me.id.toString(),
      })
    }
    return leaderboard
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
