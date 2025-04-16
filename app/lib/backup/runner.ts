import { AbsolutePeriod, BackupData, BackupModel, DialogData, EncryptedByteView, EntityData, EntityRecordData, EntityType, MessageData, ServiceMessageData } from '@/api'
import { Link, SpaceDID, Client as StorachaClient, UnknownLink } from '@storacha/ui-react'
import { Api, TelegramClient } from '@/vendor/telegram'
import * as dagCBOR from '@ipld/dag-cbor'
import { Block } from 'multiformats'
import { encode as encodeBlock } from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import { CARWriterStream } from 'carstream'
import { createFileEncoderStream } from '@storacha/upload-client/unixfs'
import { Entity } from '@/vendor/telegram/define'
import * as Crypto from '@/lib/crypto'
import { toAsyncIterable } from '@/lib/utils'

const versionTag = 'tg-miniapp-backup@0.0.1'
const maxMessages = 1_000

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
}

export const run = async (ctx: Context, space: SpaceDID, dialogs: Set<bigint>, period: AbsolutePeriod, options?: Options): Promise<UnknownLink> => {
  const dialogDatas: BackupData['dialogs'] = {}
  const pendingDialogIDs = Array.from(dialogs)

  // null value signals that the current dialog has completed
  let dialogEntity: Entity | null = null

  let entities: EntityRecordData = {}
  let messages: Array<MessageData | ServiceMessageData> = []
  let messageLinks: Array<Link<EncryptedByteView<Array<MessageData | ServiceMessageData>>>> = []

  // null value signals that no more messages will come and the current dialog
  // can now be finalized
  let messageIterator: AsyncIterator<Api.TypeMessage> | null = null

  const blockStream = new ReadableStream<Block>({
    async pull (controller) {
      if (!dialogEntity) {
        // get the next dialog to back up
        const dialogID = pendingDialogIDs.shift()
        if (!dialogID) {
          // we finished!
          console.log(`creating root with ${Object.entries(dialogDatas).length} dialogs`)
          const rootData: BackupModel = {
            [versionTag]: { dialogs: dialogDatas, period }
          }
          const rootBlock = await encodeBlock({ value: rootData, codec: dagCBOR, hasher: sha256 })
          controller.enqueue(rootBlock)
          controller.close()
          return
        }

        dialogEntity = await ctx.telegram.getEntity(dialogID)

        let minId
        if (period[0] > 0) {
          // if start date is not the beginning of time get the first message
          // before the start date (if there is one), and then iterate from end
          // date to first message (exclusive).
          const [firstMessage] = await ctx.telegram.getMessages(dialogID, {
            limit: 1,
            offsetDate: period[0],
          })
          minId = firstMessage?.id
        }
        messageIterator = ctx.telegram.iterMessages(dialogID, {
          offsetDate: period[1],
          minId
        })[Symbol.asyncIterator]()
      }

      if (!messageIterator) {
        // we ran out of messages, create entries and a dialog object
        console.log(`creating ${Object.entries(entities).length} entities`)
        let entitiesRoot
        for await (const b of toAsyncIterable(encodeAndEncrypt(ctx, entities))) {
          entitiesRoot = b.cid
          controller.enqueue(b)
        }
        if (!entitiesRoot) throw new Error('missing entities root')
        entities = {}

        const dialogData: DialogData = {
          ...toEntityData(dialogEntity),
          entities: entitiesRoot,
          messages: messageLinks,
        }

        console.log(`creating dialog: ${dialogEntity.id}`)
        let dialogRoot
        for await (const b of toAsyncIterable(encodeAndEncrypt(ctx, dialogData))) {
          dialogRoot = b.cid
          controller.enqueue(b)
        }
        if (!dialogRoot) throw new Error('missing dialog root')
        messageLinks = []

        dialogDatas[dialogEntity.id] = dialogRoot
        dialogEntity = null // move onto the next dialog
        return
      }

      while (true) {
        const { value: message, done } = await messageIterator.next()
        if (done) {
          messageIterator = null
          await options?.onDialogRetrieved?.(dialogEntity.id.value)
          break
        }

        if (message.className === 'MessageEmpty') {
          // TODO: IDK what do we do here?
          continue
        }
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
        if (messages.length === maxMessages) {
          break
        }
      }

      console.log(`creating ${messages.length} messages`)
      let messagesRoot
      for await (const b of toAsyncIterable(encodeAndEncrypt(ctx, messages))) {
        messagesRoot = b.cid
        controller.enqueue(b)
      }

      if (!messagesRoot) throw new Error('missing message root')
      messageLinks.push(messagesRoot)
      messages = []
    }
  })

  await ctx.storacha.setCurrentSpace(space)
  const root = await ctx.storacha.uploadCAR({
    stream: () => blockStream.pipeThrough(new CARWriterStream())
  })
  console.log(`backup job complete: ${root}`)
  return root
}

const encodeAndEncrypt = <T>(ctx: Context, data: T) =>
  createFileEncoderStream({
    stream: () => new ReadableStream({
      async pull (controller) {
        const bytes = dagCBOR.encode(data)
        const encryptedBytes = await Crypto.encryptContent(bytes, ctx.encryptionPassword)
        controller.enqueue(encryptedBytes)
        controller.close()
      }
    })
  }) as ReadableStream<Block<EncryptedByteView<T>>>

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

const toMessageData = (message: Api.Message | Api.MessageService): MessageData | ServiceMessageData => {
  let from
  if (message.fromId?.className === 'PeerUser') {
    from = message.fromId.userId.toString()
  } else if (message.fromId?.className === 'PeerChat') {
    from = message.fromId.chatId.toString()
  } else if (message.fromId?.className === 'PeerChannel') {
    from = message.fromId.channelId.toString()
  }

  if (message.className === 'MessageService') {
    return {
      id: message.id,
      type: 'service',
      ...(from == null ? {} : { from }),
      date: message.date,
    }
  }

  return {
    id: message.id,
    type: 'message',
    ...(from == null ? {} : { from }),
    date: message.date,
    message: message.message ?? ''
  }
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
