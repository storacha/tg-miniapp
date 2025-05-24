'use server'

import { create as createJobServer } from '@/lib/server/server'
import Queue from 'p-queue'
import { DialogInfo, JobRequest, LeaderboardUser, Ranking } from '@/api'
import { getTelegramClient } from '@/lib/server/telegram-manager'
import { Api } from 'telegram'
import { decodeStrippedThumb, toJPGDataURL } from '@/lib/utils'
import { getEntityType } from '@/lib/backup/utils'
import { getDB } from '@/lib/server/db'
import bigInt from 'big-integer'
import { toResultFn } from '@/lib/errorhandling'

//TODO replace with actual server action
  const queue = new Queue({concurrency: 1})
  const server = await createJobServer({
    queueFn: (jr: JobRequest) => {
      return queue.add(async () => {
        await server.handleJob(jr)
      })
    }
  })
export const sendRequest = async (jr: JobRequest) => server.queueJob(jr)
// end TODO


const _getMe = async (sessionString: string): Promise<string> => {
	const client = await getTelegramClient(sessionString)

	if(!client.connected){
		await client.connect()
	}

	const user = await client.getMe()
	return user.id.toString()
}

export const getMe = toResultFn(_getMe)

export const listDialogs = toResultFn(async (sessionString: string, paginationParams: { limit: number, offsetId?: number, offsetDate?: number, offsetPeer?: string}) => {
	const client = await getTelegramClient(sessionString)

	if(!client.connected){
		await client.connect()
	}
	
	console.log('list dialogs with current params: ', paginationParams)

	try {
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
	} catch (err) {
		console.error('Error fetching chats:', err)
		throw err
	} finally{
		await client.disconnect()
	}
})

export const getLeaderboard = toResultFn(async (sessionString: string) : Promise<LeaderboardUser[]> => {
	const client = await getTelegramClient(sessionString)
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
})

export const getRanking = toResultFn(async (sessionString: string) : Promise<Ranking | undefined> => {
	const id = await _getMe(sessionString)
	return await getDB().rank(BigInt(id))
})