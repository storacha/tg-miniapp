import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions'
import {
  telegramAPIID,
  telegramAPIHash,
  defaultClientParams,
} from '@/lib/server/constants'
import { LogLevel } from 'telegram/extensions/Logger'
import { toEntityData } from './runner'
import { cleanUndef, getInitials } from '../utils'
import { DialogInfo } from '@/api'
/**
 * Override console.error globally to handle TIMEOUT errors from Telegram client
 * This is a workaround for the issue where Telegram client logs TIMEOUT errors
 * directly via console.error bypassing the library's logger system
 */
const _origConsoleError = console.error

// attach a guard to globalThis so we don't override multiple times
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!(globalThis as any).__telegram_console_error_overridden) {
  console.error = (...args: unknown[]) => {
    const err = args[0]
    const isTelegramTimeout =
      err instanceof Error &&
      err.message === 'TIMEOUT' &&
      typeof err.stack === 'string' &&
      err.stack.includes('telegram')
    if (isTelegramTimeout) {
      // console.debug(String(err)) // Commented out to reduce log noise
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _origConsoleError.apply(console, args as any)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).__telegram_console_error_overridden = true
}

export const getTelegramClient = async (
  session: string
): Promise<TelegramClient> => {
  const sessionString = new StringSession(session)
  // DC ip servers need to be set to IP addresses on node
  // see https://github.com/gram-js/gramjs/issues/344#issuecomment-1405518285
  // and further discussion in @gramjschat on Telegram
  const dcServers: Record<number, string> = {
    1: '149.154.175.54',
    2: '149.154.167.50',
    3: '149.154.175.100',
    4: '149.154.167.91',
    5: '91.108.56.103',
  }

  sessionString.setDC(
    sessionString.dcId,
    dcServers[sessionString.dcId],
    sessionString.port
  )
  const telegramClient = new TelegramClient(
    sessionString,
    telegramAPIID,
    telegramAPIHash,
    defaultClientParams
  )

  telegramClient.setLogLevel(LogLevel.ERROR)

  if (!(await telegramClient.connect())) {
    throw new Error('failed to connect to telegram')
  }
  if (!(await telegramClient.checkAuthorization())) {
    throw new Error('client authorization failed')
  }

  return telegramClient
}

export const withClient = <T extends [...unknown[]], U>(
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
      try {
        // this disconnect all connections and also disconnects any borrowed sender instances
        // it also makes the client unusable, but this is not a problem since we are always creating a new one
        await client.destroy()
      } catch (error) {
        console.warn('Error cleaning up Telegram client:', error)
      }
    }
  }
}

export const telegramLogout = withClient(async (client: TelegramClient) => {
  console.log('logging out from telegram client..')
  await client.invoke(new Api.auth.LogOut())
  console.log('logged out from telegram client')
})

export const _getMe = async (client: TelegramClient) => {
  const user = await client.getMe()
  return user.id.toString()
}

export const getMe = withClient(_getMe)

export const listDialogs = withClient(
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

    // console.log('total dialogs: ', chats.length)
    // console.log('first dialog: ', chats[0])
    // console.log('last dialog: ', chats[chats.length - 1])
    console.log('next params: ', offsetParams)

    return {
      chats,
      offsetParams,
    }
  }
)
