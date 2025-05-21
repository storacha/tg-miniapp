'use server'

import { create as createJobServer } from '@/lib/server/server'
import Queue from 'p-queue'
import { DialogInfo, JobRequest } from '@/api'
import { getTelegramClient } from '@/lib/server/telegram-manager'
import { TelegramClient } from 'telegram'
import { decodeStrippedThumb, toJPGDataURL } from '@/lib/utils'
import { getEntityType } from '@/lib/backup/utils'

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


export const getServerTelegramClient = async (sessionString: string): Promise<TelegramClient> => {
  return await getTelegramClient(sessionString)
}

export const getMe = async (sessionString: string): Promise<string> => {
	const client = await getTelegramClient(sessionString)

	if(!client.connected){
		await client.connect()
	}

	const user = await client.getMe()
	console.log('get Me: ', user.id.toString())
	return user.id.toString()
}

export const listDialogs = async (sessionString: string, paginationParams: { limit: number, offsetId?: number, offsetDate?: number, offsetPeer?: string}) => {
	const client = await getTelegramClient(sessionString)

	if(!client.connected){
		await client.connect()
	}
	
	console.log('current params: ', paginationParams)

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

		console.log('next params: ', offsetParams)
		console.log(chats)

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
}