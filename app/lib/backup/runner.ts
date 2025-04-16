import { AbsolutePeriod } from '@/api'
import { SpaceDID, Client as StorachaClient, UnknownLink } from '@storacha/ui-react'
import { Api, TelegramClient } from '@/vendor/telegram'
import * as dagCBOR from '@ipld/dag-cbor'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import * as CAR from '@storacha/upload-client/car'
import * as Crypto from '../crypto'
import { IterMessagesParams } from '@/vendor/telegram/client/messages'

const versionTag = 'tg-miniapp-backup@0.0.1'

export interface Context {
  storacha: StorachaClient
  telegram: TelegramClient
  encryptionPassword: string
}

export interface Options {
  onDialogStored?: () => unknown
}

export const run = async (ctx: Context, space: SpaceDID, dialogs: Set<bigint>, period: AbsolutePeriod, options?: Options): Promise<UnknownLink> => {
  const onDialogStored = options?.onDialogStored
  const dialogMessages: Record<string, UnknownLink> = {}

  const selectedChats = Array.from(dialogs)

  if (!ctx.telegram.connected) {
    await ctx.telegram.connect()
  }

  for (const chatId of selectedChats) {
    console.log(`Runner.run: chat ID ${chatId} getting messages... `)
    const messages = []
    const [firstMessage] = await ctx.telegram.getMessages(chatId, {
      limit: 1,
      offsetDate: period[0],
    })
    
    console.log('firstMessage: ', firstMessage)
    const options: Partial<IterMessagesParams> = { offsetDate: period[1] }
    if(firstMessage) {
      options.minId = firstMessage.id
    }

    for await (const message of ctx.telegram.iterMessages(chatId, options)) {
      console.log(`Message id: ${message.id}, text: ${message.text}, message: ${message.message}, has media: ${message.media != undefined}`)
      
      let mediaCid
      // if (message.media) {
      //   try {
      //     TODO: download the media in the next app iteration
      //     const mediaBuffer = await message.downloadMedia()

      //     const mediaCid = await uploadToStoracha(mediaBuffer)

      //     formatted.media.mediaUrl = `${STORACHA_GATEWAY}/${mediaCid}`
      //   } catch (err) {
      //     console.error(`Error downloading media for message ${message.id}:`, err)
      //   }
      // }

      const parsedMessage = await formatMessage(ctx.telegram, message, mediaCid)
      messages.push(parsedMessage)
    }

    console.log(`Backup for chat ${chatId}:`, messages)

    const backupChatData = dagCBOR.encode(messages)

    console.log('encrypting backup...')
    const encryptedContent = await Crypto.encryptContent(backupChatData, ctx.encryptionPassword)
    console.log('encryptedContent: ', encryptedContent)
    const blob = new Blob([encryptedContent])

    console.log('uploading chat data to storacha...')
    await ctx.storacha.setCurrentSpace(space)
    const root = await ctx.storacha.uploadFile(blob)
    console.log('Upload CID: ', root.toString())

    dialogMessages[chatId.toString()] = root
    await onDialogStored?.()
  }

  const rootData = {
    [versionTag]: {
      dialogs: dialogMessages,
      period,
    }
  }
  const rootBlock = await Block.encode({ value: rootData, codec: dagCBOR, hasher: sha256 })
  await ctx.storacha.uploadCAR(await CAR.encode([rootBlock], rootBlock.cid))
  console.log(`backup job complete: ${rootBlock.cid}`)
  return rootBlock.cid
}

export function calculatePoints(sizeInBytes: number): number {
    const POINTS_PER_BYTE = Number(process.env.NEXT_PUBLIC_POINTS_PER_BYTE) ?? 1
    return sizeInBytes * POINTS_PER_BYTE
}

function getMediaType(media?: Api.TypeMessageMedia) {
    if (!media) return null
    if (!('_' in media)) return 'file'
    switch (media._) {
        case 'messageMediaPhoto':
            return 'photo'
        case 'messageMediaDocument':
            return 'document'
        case 'messageMediaWebPage':
            return 'webpage'
        case 'messageMediaGeo':
            return 'location'
        default:
            return 'file'
    }
}

async function formatMessage(client: TelegramClient, message: Api.Message, mediaCid?: string) {
  let fromId: string | null = null
  let senderName = 'Unknown'

  console.log(message)

  try {
    const fromType = message.fromId?.className
    if (fromType) {
      const entity = await client.getEntity(message.fromId)

      switch (fromType) {
        case 'PeerUser':
          fromId = message.fromId?.userId.toString()
          // @ts-expect-error entity is a User
          senderName = `${entity.firstName ?? ''} ${entity.lastName ?? ''}`.trim()
          break
        case 'PeerChat':
          fromId = message.fromId?.chatId.toString()
          // @ts-expect-error entity is a Chat
          senderName = entity.title ?? 'Group'
          break
        case 'PeerChannel':
          fromId = message.fromId?.channelId.toString()
          // @ts-expect-error entity is a Channel
          senderName = entity.title ?? 'Channel'
          break
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch entity info for fromId ${message.fromId}`, err)
  }

  const action = message.action
  ? {
      name: message.action.className.replace(/^MessageAction/, '').split(/(?=[A-Z])/).join(" "),
      arguments: message.action.originalArgs
    }
  : null

  const media = message.media
    ? {
        mediaType: getMediaType(message.media),
        mediaCid: mediaCid ?? null
      }
    : null

  const reactions = message.reactions?.results?.map(r => ({
    reaction: r.reaction.originalArgs,
    count: r.count
  })) ?? []

  const replies = message.replies
    ? {
        count: message.replies.replies,
        thread: message.replies.comments
      }
    : null

  return {
    id: message.id.toString(),
    messageType: message.className,
    action,
    outgoing: message.out,
    date: message.date,
    from: {
      id: fromId,
      name: senderName
    },
    text: message.message ?? '',
    timestamp: message.date,
    replyTo: message.replyTo?.originalArgs ?? null,
    media,
    reactions,
    replies,
    raw: JSON.stringify(message.originalArgs, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  }
}
