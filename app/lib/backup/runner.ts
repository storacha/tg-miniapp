import { AbsolutePeriod, BackupData, BackupModel, DialogData, EncryptedByteView, EntityData, EntityRecordData, EntityType, MessageData } from '@/api'
import { Link, SpaceDID, Client as StorachaClient, UnknownLink } from '@storacha/ui-react'
import { Api, TelegramClient } from '@/vendor/telegram'
import * as dagCBOR from '@ipld/dag-cbor'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import * as CAR from '@storacha/upload-client/car'
import * as Crypto from '../crypto'
import { IterMessagesParams } from '@/vendor/telegram/client/messages'
import { Entity } from '@/vendor/telegram/define'

const versionTag = 'tg-miniapp-backup@0.0.1'

export interface Context {
  storacha: StorachaClient
  telegram: TelegramClient
  encryptionPassword: string
}

export interface Options {
  /**
   * Called when messages for a dialog have been downloaded from Telegram, but
   * not yet stored.
   */
  onDialogRetrieved?: (id: bigint) => unknown
  /**
   * Called when an entire dialog has been stored with Storacha.
   */
  onDialogStored?: (id: bigint) => unknown
}

export const run = async (ctx: Context, space: SpaceDID, dialogs: Set<bigint>, period: AbsolutePeriod, options?: Options): Promise<UnknownLink> => {
  const { onDialogStored, onDialogRetrieved } = options ?? {}
  const dialogMessages: BackupData['dialogs'] = {}

  console.log('chats:', dialogs)
  const selectedChats = Array.from(dialogs)

  if (!ctx.telegram.connected) {
    await ctx.telegram.connect()
  }

  for (const chatId of selectedChats) {
    console.log('backing up dialog:', chatId)
    const dialogEntity = await ctx.telegram.getEntity(chatId)
    const entities: EntityRecordData = {}
    const messages: MessageData[] = []
    const [firstMessage] = await ctx.telegram.getMessages(chatId, {
      limit: 1,
      offsetDate: period[0],
    })
    console.log('first message:', firstMessage)
    const options: Partial<IterMessagesParams> = { offsetDate: period[1] }
    if (firstMessage) {
      options.minId = firstMessage.id
    }

    for await (const message of ctx.telegram.iterMessages(chatId, options)) {
      let fromID
      if (message.fromId?.className === 'PeerUser') {
        fromID = message.fromId.userId
      } else if (message.fromId?.className === 'PeerChat') {
        fromID = message.fromId.chatId
      } else if (message.fromId?.className === 'PeerChannel') {
        fromID = message.fromId.channelId
      }
      if (!fromID) {
        // TODO: IDK what do we do here?
        continue
      }

      entities[fromID] = entities[fromID] ?? toEntityData(await ctx.telegram.getEntity(fromID))
      
      // let mediaCid
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

      messages.push(toMessageData(message))
    }
    await onDialogRetrieved?.(chatId)

    const [messagesLink, entitiesLink] = await Promise.all([
      encodeEncryptAndUpload(ctx, space, messages),
      encodeEncryptAndUpload(ctx, space, entities)
    ])

    const dialogData: DialogData = {
      ...toEntityData(dialogEntity),
      entities: entitiesLink,
      messages: messagesLink,
    }

    dialogMessages[chatId.toString()] = await encodeEncryptAndUpload(ctx, space, dialogData)
    await onDialogStored?.(chatId)
  }

  const rootData: BackupModel = {
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

const encodeEncryptAndUpload = async <T>(ctx: Context, space: SpaceDID, data: T): Promise<Link<EncryptedByteView<T>>> => {
  try {
    const bytes = dagCBOR.encode(data)
    const encryptedBytes = await Crypto.encryptContent(bytes, ctx.encryptionPassword)
    const blob = new Blob([encryptedBytes])
    await ctx.storacha.setCurrentSpace(space)
    return (await ctx.storacha.uploadFile(blob)) as Link<EncryptedByteView<T>>
  } catch (err) {
    console.error(data)
    throw err
  }
}

// TODO: reinstate when we add media to backups
// function getMediaType(media?: Api.TypeMessageMedia) {
//     if (!media) return null
//     if (!('_' in media)) return 'file'
//     switch (media._) {
//         case 'messageMediaPhoto':
//             return 'photo'
//         case 'messageMediaDocument':
//             return 'document'
//         case 'messageMediaWebPage':
//             return 'webpage'
//         case 'messageMediaGeo':
//             return 'location'
//         default:
//             return 'file'
//     }
// }

const toMessageData = (message: Api.Message): MessageData => {
  const id = message.id
  let from = '0'
  if (message.fromId?.className === 'PeerUser') {
    from = message.fromId.userId.toString()
  } else if (message.fromId?.className === 'PeerChat') {
    from = message.fromId.chatId.toString()
  } else if (message.fromId?.className === 'PeerChannel') {
    from = message.fromId.channelId.toString()
  }
  const date = message.date ?? 0
  return { id, from, date, message: message.message ?? '' }
}

const toEntityData = (entity: Entity): EntityData => {
  const id = entity.id?.value ?? '0'
  let type: EntityType = 'unknown'
  let name = ''
  let photo: EntityData['photo']
  if (entity.className === 'User') {
    type = 'user'
    name = [entity.firstName, entity.lastName].filter(s => !!s).join(' ')
    if (entity.photo?.className === 'UserProfilePhoto') {
      photo = { id: entity.photo.photoId.toString() }
      if (entity.photo.strippedThumb) {
        photo.strippedThumb = new Uint8Array(entity.photo.strippedThumb)
      }
    }
  } else if (entity.className === 'Chat' || entity.className === 'Channel') {
    type = entity.className === 'Chat' ? 'chat' : 'channel'
    name = entity.title ?? ''
    if (entity.photo?.className === 'ChatPhoto') {
      photo = { id: entity.photo.photoId.toString() }
      if (entity.photo.strippedThumb) {
        photo.strippedThumb = new Uint8Array(entity.photo.strippedThumb)
      }
    }
  }
  return { id, type, name, ...(photo && { photo }) }
}
