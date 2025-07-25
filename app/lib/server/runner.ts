import {
  AbsolutePeriod,
  ActionData,
  BackupData,
  BackupModel,
  BotAppData,
  DialogData,
  DocumentAttributeData,
  DocumentData,
  EncryptedTaggedByteView,
  Cipher,
  EntityData,
  EntityID,
  EntityRecordData,
  EntityType,
  InputGroupCallData,
  MaskCoordsData,
  MessageData,
  MessageEntityData,
  PaymentChargeData,
  PaymentRequestedInfoData,
  PhotoData,
  PhotoSizeData,
  PostAddressData,
  RequestedPeerData,
  RGB24Color,
  SecureCredentialsEncryptedData,
  SecureDataData,
  SecureFileData,
  SecureValueData,
  SecureValueType,
  ServiceMessageData,
  StarGiftData,
  StickerSetData,
  TextWithEntitiesData,
  ThumbType,
  ToString,
  UnknownBlock,
  VideoSizeData,
  VideoType,
  WallPaperData,
  WallPaperSettingsData,
  MediaData,
} from '@/api'
import pRetry from 'p-retry'
import * as Type from '@/api'
import { Api, TelegramClient } from 'telegram'
import * as dagCBOR from '@ipld/dag-cbor'
import * as raw from 'multiformats/codecs/raw'
import { CARWriterStream } from 'carstream'
import { Entity } from 'telegram/define'
import { cleanUndef, toAsyncIterable, withCleanUndef } from '@/lib/utils'
import { createEncodeAndEncryptStream, decryptAndDecode } from '@/lib/crypto'
import { DID, Link, UnknownLink } from '@ucanto/client'
import { Client as StorachaClient } from '@storacha/client'
import { CARMetadata } from '@storacha/ui-react'
import { buildDialogInputPeer } from '../backup/utils'
import bigInt from 'big-integer'

type SpaceDID = DID<'key'>
const versionTag = 'tg-miniapp-backup@0.0.1'
const maxMessages = 1_000
const updateInterval = 50

const MAX_DOCUMENT_SIZE = BigInt(10 * 1024 * 1024) // 10 MB
const isDownloadableMedia = (media: Api.TypeMessageMedia): boolean => {
  return (
    media.className === 'MessageMediaPhoto' ||
    media.className === 'MessageMediaDocument' // this can represent a video, audio or other document type
  )
}
export interface Context {
  storacha: StorachaClient
  telegram: TelegramClient
  cipher: Cipher
}

export interface Options {
  /**
   * Called when messages for a dialog have been downloaded from Telegram, but
   * not yet stored.
   */
  onDialogRetrieved?: (id: bigint) => unknown
  /**
   * Called when all messages for a dialog have been retrieved
   */
  onMessagesRetrieved?: (id: bigint, percentage: number) => unknown
  /**
   * Called when a shard is stored, a dialog can have multiple shards.
   */
  onShardStored?: (meta: CARMetadata, dialogId?: ToString<bigint>) => unknown
}

const backupDialog = async (
  ctx: Context,
  period: AbsolutePeriod,
  options: Options | undefined,
  messageIterator: AsyncIterator<Api.TypeMessage> | null,
  dialogEntity: Type.DialogInfo,
  minMsgId: number | undefined,
  dialogMessageCount: number
) => {
  const entities: EntityRecordData = {}
  let messages: Array<MessageData | ServiceMessageData> = []
  const messageLinks: Array<
    Link<EncryptedTaggedByteView<Array<MessageData | ServiceMessageData>>>
  > = []
  let messagesSoFar = 0

  const blockStream = new ReadableStream<UnknownBlock>({
    async start() {
      if (!ctx.telegram.connected) {
        await ctx.telegram.connect()
      }
    },
    async pull(controller) {
      if (!messageIterator) {
        // we ran out of messages, create entries and a dialog object
        console.log(`creating ${Object.entries(entities).length} entities`)
        let entitiesRoot
        for await (const b of toAsyncIterable(
          createEncodeAndEncryptStream(dagCBOR, ctx.cipher, entities)
        )) {
          entitiesRoot = b.cid as Link<
            EncryptedTaggedByteView<EntityRecordData>
          >
          controller.enqueue(b)
        }

        if (!entitiesRoot) throw new Error('missing entities root')

        const dialogData: DialogData = {
          ...dialogEntity,
          entities: entitiesRoot,
          messages: messageLinks,
        }

        console.log(`creating dialog: ${dialogEntity.id}`)
        let dialogRoot
        for await (const b of toAsyncIterable(
          createEncodeAndEncryptStream(dagCBOR, ctx.cipher, dialogData)
        )) {
          dialogRoot = b.cid as Link<EncryptedTaggedByteView<DialogData>>
          controller.enqueue(b)
        }

        if (!dialogRoot) throw new Error('missing dialog root')
        controller.close()
        return
      }

      while (true) {
        let message, done
        try {
          ;({ value: message, done } = await messageIterator.next())
        } catch (error) {
          if (
            error instanceof Error &&
            error.message?.includes('Could not find the input entity for ')
          ) {
            await syncDialogEntity(ctx.telegram, dialogEntity.id)

            messageIterator = ctx.telegram
              .iterMessages(dialogEntity.id, {
                offsetDate: period[1],
                minId: minMsgId,
              })
              [Symbol.asyncIterator]()
            ;({ value: message, done } = await messageIterator.next())
          } else {
            throw error
          }
        }

        if (done) {
          messageIterator = null
          break
        }

        if (message.className === 'MessageEmpty') {
          // TODO: IDK what do we do here?
          continue
        }

        let fromID = message.fromId && toPeerID(message.fromId)
        const peerID = toPeerID(message.peerId)

        if (!fromID) {
          /**
           *  If fromID is undefined and the peerId is of type PeerUser, use the userId from peerId as the from ID.
           *  This means that this is the chat of the user who our Telegram user is talking to.
           */
          fromID = peerID
        }

        if (entities[fromID]) {
          entities[fromID] = entities[fromID]
        } else {
          try {
            const sender = await message.getSender()
            if (sender) {
              entities[fromID] = toEntityData(sender)
            }
          } catch (e) {
            console.error(`Failed to get entity for fromId: ${fromID}`, e)
          }
        }

        let mediaRoot
        if (message.media && isDownloadableMedia(message.media)) {
          const mediaBytes = await pRetry(
            () => {
              return getMediaBytes(ctx, message)
            },
            {
              retries: 5,
              onFailedAttempt: (error) => {
                console.warn(
                  `Failed to download media for message ${message.id} due to Timeout: ${error.attemptNumber} attempt(s), ${error.retriesLeft} retries left`
                )
              },
            }
          )

          if (mediaBytes.length === 0) throw new Error('missing media bytes')

          for await (const b of toAsyncIterable(
            createEncodeAndEncryptStream(raw, ctx.cipher, mediaBytes)
          )) {
            mediaRoot = b.cid as Link<EncryptedTaggedByteView<Uint8Array>>
            controller.enqueue(b)
          }

          if (!mediaRoot) throw new Error('missing media root')
        }

        messages.push(toMessageData(message, fromID, mediaRoot))
        // for last segment (or only segment) upload more frequently
        if (messagesSoFar + maxMessages > dialogMessageCount) {
          if (messages.length % updateInterval === 0) {
            await options?.onMessagesRetrieved?.(
              BigInt(dialogEntity.id.toString()),
              (messagesSoFar + messages.length) / dialogMessageCount
            )
          }
        }
        if (messages.length === maxMessages) {
          break
        }
      }

      messagesSoFar += messages.length
      await options?.onMessagesRetrieved?.(
        BigInt(dialogEntity.id.toString()),
        messagesSoFar / dialogMessageCount
      )

      console.log(`creating ${messages.length} messages`)

      let messagesRoot
      for await (const b of toAsyncIterable(
        createEncodeAndEncryptStream(dagCBOR, ctx.cipher, messages)
      )) {
        messagesRoot = b.cid as Link<
          EncryptedTaggedByteView<Array<MessageData | ServiceMessageData>>
        >
        controller.enqueue(b)
      }

      if (!messagesRoot) throw new Error('missing message root')
      messageLinks.push(messagesRoot)
      messages = []
    },
  })

  const dialogRoot = await ctx.storacha.uploadCAR(
    {
      stream: () => blockStream.pipeThrough(new CARWriterStream()),
    },
    {
      onShardStored: (meta: CARMetadata) => {
        options?.onShardStored?.(meta, dialogEntity.id)
      },
    }
  )

  return dialogRoot as Link<EncryptedTaggedByteView<DialogData>>
}

const uploadRoot = async (
  ctx: Context,
  rootData: BackupModel,
  options?: Options
) => {
  const blockStream = new ReadableStream<UnknownBlock>({
    async pull(controller) {
      for await (const b of toAsyncIterable(
        createEncodeAndEncryptStream(dagCBOR, ctx.cipher, rootData)
      )) {
        controller.enqueue(b)
      }
      controller.close()
      return
    },
  })

  const root = await ctx.storacha.uploadCAR(
    {
      stream: () => blockStream.pipeThrough(new CARWriterStream()),
    },
    { onShardStored: options?.onShardStored }
  )

  return root
}

const gatewayURL =
  process.env.NEXT_PUBLIC_STORACHA_GATEWAY_URL || 'https://w3s.link'

const getFromStoracha = async (cid: string) => {
  const url = new URL(`/ipfs/${cid}`, gatewayURL)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch: ${response.status} ${response.statusText} ${url}`
    )
  }
  return response
}

export const deleteDialogFromBackup = async (
  ctx: Context,
  dialogID: ToString<EntityID>,
  backupCid: string
): Promise<UnknownLink> => {
  const response = await getFromStoracha(backupCid)
  const encryptedBackupRaw = new Uint8Array(await response.arrayBuffer())
  const decryptedBackupRaw = (await decryptAndDecode(
    ctx.cipher,
    dagCBOR,
    encryptedBackupRaw
  )) as BackupModel
  const dialogCid = decryptedBackupRaw[versionTag].dialogs[dialogID]

  if (!dialogCid) {
    throw new Error(`Dialog with ID ${dialogID} not found in backup`)
  }

  await ctx.storacha.remove(dialogCid, { shards: true })
  delete decryptedBackupRaw[versionTag].dialogs[dialogID]
  return await uploadRoot(ctx, decryptedBackupRaw)
}

export const run = async (
  ctx: Context,
  space: SpaceDID,
  dialogs: Type.DialogsById,
  period: AbsolutePeriod,
  options?: Options
): Promise<UnknownLink> => {
  const dialogDatas: BackupData['dialogs'] = {}
  const pendingDialogIDs = Object.keys(dialogs)

  // null value signals that the current dialog has completed
  let dialogEntity: Type.DialogInfo | null = null
  let dialogMessageCount: number

  // null value signals that no more messages will come and the current dialog
  // can now be finalized
  let messageIterator: AsyncIterator<Api.TypeMessage> | null = null
  let minMsgId: number | undefined

  while (pendingDialogIDs.length > 0) {
    // get the next dialog to back up
    const dialogID = pendingDialogIDs.shift()
    if (!dialogID) {
      throw new Error('missing dialog ID')
    }
    dialogEntity = { id: dialogID, ...dialogs[dialogID] }
    await options?.onDialogRetrieved?.(BigInt(dialogID))
    const dialogInput = buildDialogInputPeer(dialogEntity) ?? bigInt(dialogID)

    if (period[0] > 0) {
      // if start date is not the beginning of time get the first message
      // before the start date (if there is one), and then iterate from end
      // date to first message (exclusive).
      const messages = await callWithDialogsSync(
        () =>
          ctx.telegram.invoke(
            new Api.messages.GetHistory({
              peer: dialogInput,
              limit: 1,
              offsetDate: period[0],
            })
          ),
        ctx.telegram,
        dialogID
      )
      if (
        messages instanceof Api.messages.MessagesSlice ||
        messages instanceof Api.messages.ChannelMessages
      ) {
        const firstMessage = messages.messages[0]
        dialogMessageCount = messages.offsetIdOffset || 0
        minMsgId = firstMessage?.id
      } else if (messages instanceof Api.messages.Messages) {
        const firstMessage = messages.messages[0]
        minMsgId = firstMessage?.id
        dialogMessageCount = messages.messages.length
      } else {
        dialogMessageCount = messages.count || 0
        minMsgId = undefined
      }
    } else {
      const messages = await callWithDialogsSync(
        () =>
          ctx.telegram.getMessages(dialogInput, {
            limit: 1,
          }),
        ctx.telegram,
        dialogID
      )
      dialogMessageCount = messages.total || 0
    }

    console.log(
      `retrieving ${dialogMessageCount} messages for dialog: ${dialogID}`
    )

    messageIterator = ctx.telegram
      .iterMessages(dialogInput, {
        offsetDate: period[1],
        minId: minMsgId,
      })
      [Symbol.asyncIterator]()

    dialogDatas[dialogEntity.id.toString()] = await backupDialog(
      ctx,
      period,
      options,
      messageIterator,
      dialogEntity,
      minMsgId,
      dialogMessageCount
    )
  }

  console.log(
    `creating root with ${Object.entries(dialogDatas).length} dialogs`
  )
  const rootData: BackupModel = {
    [versionTag]: { dialogs: dialogDatas, period },
  }

  const root = await uploadRoot(ctx, rootData, options)
  console.log(`backup job complete: ${root}`)
  return root
}

const getMediaBytes = async (ctx: Context, message: Api.Message) => {
  const media = message.media
  if (media instanceof Api.MessageMediaDocument && media.video) {
    const document = media.document
    const altDocuments = media.altDocuments
    if (
      document instanceof Api.Document &&
      BigInt(document.size.toString()) > MAX_DOCUMENT_SIZE
    ) {
      console.log(
        `Video document size is too large: ${document.size}, trying alternative documents...`
      )
      let maxSoFar = BigInt(0)
      let minOverSoFar = BigInt(document.size.toString())
      const foundDocument = altDocuments?.findLast((doc) => {
        if (!(doc instanceof Api.Document)) {
          return false
        }
        console.log(
          `Checking alternative document: ${doc.id}, size: ${doc.size}`
        )
        const docSize = BigInt(doc.size.toString())
        const video = doc.attributes.find(
          (attr) => attr.className === 'DocumentAttributeVideo'
        )

        if (!video || video.videoCodec !== 'h264') {
          return false
        }
        console.log(`Found video codec: ${video.videoCodec}, checking size...`)
        if (docSize > maxSoFar) {
          if (docSize <= MAX_DOCUMENT_SIZE) {
            maxSoFar = docSize
            return true
          }
          // if the document is larger than the max size, we only consider it if it's smaller than the current minOverSoFar
          if (maxSoFar === BigInt(0) && docSize < minOverSoFar) {
            minOverSoFar = docSize
            return true
          }
        }
        return false
      })
      if (foundDocument && foundDocument instanceof Api.Document) {
        console.log(
          `Found alternative document: ${foundDocument.id}, size: ${foundDocument.size}`
        )
        const mediaBytes = await ctx.telegram.downloadFile(
          new Api.InputDocumentFileLocation({
            id: foundDocument.id,
            accessHash: foundDocument.accessHash,
            fileReference: foundDocument.fileReference,
            thumbSize: '',
          }),
          {
            fileSize: foundDocument.size,
            dcId: foundDocument.dcId,
          }
        )
        if (mediaBytes instanceof Buffer) {
          return new Uint8Array(mediaBytes)
        }
      }
    }
  }

  return new Uint8Array((await message.downloadMedia()) as Buffer)
}
const syncDialogEntity = async (client: TelegramClient, entityId: string) => {
  console.log(`Entity not found for ID: ${entityId}, trying to sync...`)
  for await (const dialog of client.iterDialogs()) {
    if (dialog?.entity?.id.toString() === entityId) {
      break
    }
  }
}

const callWithDialogsSync = async <T>(
  fn: () => Promise<T>,
  client: TelegramClient,
  entityId: string
): Promise<T> => {
  try {
    return await fn()
  } catch (error) {
    if (
      error instanceof Error &&
      error.message?.includes('Could not find the input entity for ')
    ) {
      await syncDialogEntity(client, entityId)
      return await fn()
    }
    throw error
  }
}

const toMessageData = (
  message: Api.Message | Api.MessageService,
  from: ToString<bigint>,
  mediaRoot?: Link<EncryptedTaggedByteView<Uint8Array>>
): MessageData | ServiceMessageData => {
  if (message.className === 'MessageService') {
    const action = toActionData(message.action)
    if (!action) throw new Error('missing service message action')
    return {
      id: message.id,
      type: 'service',
      from,
      date: message.date,
      action,
    }
  }

  const messageData: MessageData = {
    id: message.id,
    type: 'message',
    from,
    peer: toPeerID(message.peerId),
    date: message.date,
    message: message.message ?? '',
  }

  if (message.media) {
    const metadata = toMediaData(message.media)
    if (!metadata) throw new Error('missing media metadata')

    messageData['media'] = {
      metadata,
    }

    if (mediaRoot) {
      messageData['media'].content = mediaRoot
    }
  }

  return messageData
}

const toPeerID = (peer: Api.TypePeer): ToString<EntityID> => {
  if (peer.className === 'PeerUser') {
    return String(peer.userId)
  } else if (peer.className === 'PeerChat') {
    return String(peer.chatId)
  } else if (peer.className === 'PeerChannel') {
    return String(peer.channelId)
  }
  throw new Error('unknown peer type')
}

export const toEntityData = (entity: Entity): EntityData => {
  const id = entity.id.toString() ?? '0' // TODO: this should be the dialog.id, dialog.entity.id is different
  let type: EntityType = 'unknown'
  let name = ''
  let photo: EntityData['photo']
  if (entity.className === 'User') {
    type = 'user'
    name = [entity.firstName, entity.lastName].filter((s) => !!s).join(' ')
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
  return cleanUndef({ id, type, name, photo })
}

const toActionData = withCleanUndef(
  (action: Api.TypeMessageAction): ActionData | undefined => {
    switch (action.className) {
      case 'MessageActionEmpty':
        return
      case 'MessageActionChatCreate':
        return {
          type: 'chat-create',
          title: action.title,
          users: action.users.map((id) => id.toString()),
        }
      case 'MessageActionChatEditTitle':
        return {
          type: 'chat-edit-title',
          title: action.title,
        }
      case 'MessageActionChatEditPhoto':
        return {
          type: 'chat-edit-photo',
          photo: toPhotoData(action.photo),
        }
      case 'MessageActionChatDeletePhoto':
        return {
          type: 'chat-delete-photo',
        }
      case 'MessageActionChatAddUser':
        return {
          type: 'chat-add-user',
          users: action.users.map((id) => String(id)),
        }
      case 'MessageActionChatDeleteUser':
        return {
          type: 'chat-delete-user',
          user: String(action.userId),
        }
      case 'MessageActionChatJoinedByLink':
        return {
          type: 'chat-joined-by-link',
          inviter: String(action.inviterId),
        }
      case 'MessageActionChannelCreate':
        return {
          type: 'channel-create',
          title: action.title,
        }
      case 'MessageActionChatMigrateTo':
        return {
          type: 'chat-migrate-to',
          channel: String(action.channelId),
        }
      case 'MessageActionChannelMigrateFrom':
        return {
          type: 'channel-migrate-from',
          title: action.title,
          chat: String(action.chatId),
        }
      case 'MessageActionPinMessage':
        return {
          type: 'pin-message',
        }
      case 'MessageActionHistoryClear':
        return {
          type: 'history-clear',
        }
      case 'MessageActionGameScore':
        return {
          type: 'game-score',
          game: String(action.gameId),
          score: action.score,
        }
      case 'MessageActionPaymentSentMe':
        return {
          type: 'payment-sent-me',
          recurringInit: action.recurringInit,
          recurringUsed: action.recurringUsed,
          currency: action.currency,
          totalAmount: String(action.totalAmount),
          payload: new Uint8Array(action.payload),
          info: action.info && toPaymentRequestedInfoData(action.info),
          shippingOptionId: action.shippingOptionId,
          charge: toPaymentChargeData(action.charge),
        }
      case 'MessageActionPaymentSent':
        return {
          type: 'payment-sent',
          recurringInit: action.recurringInit,
          recurringUsed: action.recurringUsed,
          currency: action.currency,
          totalAmount: String(action.totalAmount),
          invoiceSlug: action.invoiceSlug,
        }
      case 'MessageActionPhoneCall':
        return {
          type: 'phone-call',
          call: String(action.callId),
        }
      case 'MessageActionScreenshotTaken':
        return {
          type: 'screenshot-taken',
        }
      case 'MessageActionCustomAction':
        return {
          type: 'custom-action',
          message: action.message,
        }
      case 'MessageActionBotAllowed':
        return {
          type: 'bot-allowed',
          attachMenu: action.attachMenu,
          fromRequest: action.fromRequest,
          domain: action.domain,
          app: action.app && toBotAppData(action.app),
        }
      case 'MessageActionSecureValuesSentMe':
        return {
          type: 'secure-values-sent-me',
          values: action.values.map((value) => toSecureValueData(value)),
          credentials:
            action.credentials &&
            toSecureCredentialsEncryptedData(action.credentials),
        }
      case 'MessageActionSecureValuesSent':
        return {
          type: 'secure-values-sent',
          types: action.types.map((type) => toSecureValueType(type)),
        }
      case 'MessageActionContactSignUp':
        return {
          type: 'contact-sign-up',
        }
      case 'MessageActionGeoProximityReached':
        return {
          type: 'geo-proximity-reached',
          from: String(action.fromId),
          to: String(action.toId),
          distance: action.distance,
        }
      case 'MessageActionGroupCall':
        return {
          type: 'group-call',
          call: toInputGroupCallData(action.call),
          duration: action.duration,
        }
      case 'MessageActionInviteToGroupCall':
        return {
          type: 'invite-to-group-call',
          call: toInputGroupCallData(action.call),
          users: action.users.map((id) => String(id)),
        }
      case 'MessageActionSetMessagesTTL':
        return {
          type: 'set-messages-ttl',
          period: action.period,
          autoSettingFrom:
            action.autoSettingFrom && String(action.autoSettingFrom),
        }
      case 'MessageActionGroupCallScheduled':
        return {
          type: 'group-call-scheduled',
          call: toInputGroupCallData(action.call),
          scheduleDate: action.scheduleDate,
        }
      case 'MessageActionSetChatTheme':
        return {
          type: 'set-chat-theme',
          emoticon: action.emoticon,
        }
      case 'MessageActionChatJoinedByRequest':
        return {
          type: 'chat-joined-by-request',
        }
      case 'MessageActionWebViewDataSentMe':
        return {
          type: 'web-view-data-sent-me',
          text: action.text,
          data: action.data,
        }
      case 'MessageActionWebViewDataSent':
        return {
          type: 'web-view-data-sent',
          text: action.text,
        }
      case 'MessageActionGiftPremium':
        return {
          type: 'gift-premium',
          currency: action.currency,
          amount: String(action.amount),
          months: action.months,
          cryptoCurrency: action.cryptoCurrency,
          cryptoAmount: action.cryptoAmount && String(action.cryptoAmount),
          message: action.message && toTextWithEntitiesData(action.message),
        }
      case 'MessageActionTopicCreate':
        return {
          type: 'topic-create',
          title: action.title,
          iconColor: action.iconColor,
          iconEmoji: action.iconEmojiId && String(action.iconEmojiId),
        }
      case 'MessageActionTopicEdit':
        return {
          type: 'topic-edit',
          title: action.title,
          iconEmoji: action.iconEmojiId && String(action.iconEmojiId),
          closed: action.closed,
          hidden: action.hidden,
        }
      case 'MessageActionSuggestProfilePhoto':
        return {
          type: 'suggest-profile-photo',
          photo: toPhotoData(action.photo),
        }
      case 'MessageActionRequestedPeer':
        return {
          type: 'requested-peer',
          button: action.buttonId,
          peers: action.peers.map((peer) => toPeerID(peer)),
        }
      case 'MessageActionSetChatWallPaper':
        return {
          type: 'set-chat-wall-paper',
          same: action.same,
          forBoth: action.forBoth,
          wallpaper: toWallPaperData(action.wallpaper),
        }
      case 'MessageActionGiftCode':
        return {
          type: 'gift-code',
          viaGiveaway: action.viaGiveaway,
          unclaimed: action.unclaimed,
          boostPeer: action.boostPeer && toPeerID(action.boostPeer),
          months: action.months,
          slug: action.slug,
          currency: action.currency,
          amount: action.amount && String(action.amount),
          cryptoCurrency:
            action.cryptoCurrency && String(action.cryptoCurrency),
          cryptoAmount: action.cryptoAmount && String(action.cryptoAmount),
          message: action.message && toTextWithEntitiesData(action.message),
        }
      case 'MessageActionGiveawayLaunch':
        return {
          type: 'giveaway-launch',
          stars: action.stars && String(action.stars),
        }
      case 'MessageActionGiveawayResults':
        return {
          type: 'giveaway-results',
          stars: action.stars,
          winnersCount: action.winnersCount,
          unclaimedCount: action.unclaimedCount,
        }
      case 'MessageActionBoostApply':
        return {
          type: 'boost-apply',
          boosts: action.boosts,
        }
      case 'MessageActionRequestedPeerSentMe':
        return {
          type: 'requested-peer-sent-me',
          button: action.buttonId,
          peers: action.peers.map((peer) => toRequestedPeerData(peer)),
        }
      case 'MessageActionPaymentRefunded':
        return {
          type: 'payment-refunded',
          peer: toPeerID(action.peer),
          currency: action.currency,
          totalAmount: String(action.totalAmount),
          payload: action.payload && new Uint8Array(action.payload),
          charge: toPaymentChargeData(action.charge),
        }
      case 'MessageActionGiftStars':
        return {
          type: 'gift-stars',
          currency: action.currency,
          amount: String(action.amount),
          stars: String(action.stars),
          cryptoCurrency:
            action.cryptoCurrency && String(action.cryptoCurrency),
          cryptoAmount: action.cryptoAmount && String(action.cryptoAmount),
          transaction: action.transactionId && String(action.transactionId),
        }
      case 'MessageActionPrizeStars':
        return {
          type: 'prize-stars',
          unclaimed: action.unclaimed,
          stars: String(action.stars),
          transaction: String(action.transactionId),
          boostPeer: toPeerID(action.boostPeer),
          giveawayMsg: action.giveawayMsgId,
        }
      case 'MessageActionStarGift':
        return {
          type: 'star-gift',
          nameHidden: action.nameHidden,
          saved: action.saved,
          converted: action.converted,
          gift: toStarGiftData(action.gift),
          message: action.message && toTextWithEntitiesData(action.message),
          convertStars: action.convertStars && String(action.convertStars),
        }
      default:
        return {
          type: 'unknown',
        }
    }
  }
)

const toPhotoData = withCleanUndef(
  (photo: Api.TypePhoto): PhotoData | undefined => {
    if (photo.className === 'PhotoEmpty') {
      return
    }

    return {
      type: 'default',
      id: photo.id.toString(),
      hasStickers: photo.hasStickers,
      accessHash: String(photo.accessHash),
      fileReference: new Uint8Array(photo.fileReference),
      date: photo.date,
      sizes: photo.sizes
        .map((s) => toPhotoSize(s))
        .filter(Boolean) as PhotoSizeData[],
      videoSizes: photo.videoSizes?.map((s) => toVideoSize(s)),
    }
  }
)

const toPhotoSize = withCleanUndef(
  (size: Api.TypePhotoSize): PhotoSizeData | undefined => {
    switch (size.className) {
      case 'PhotoSizeEmpty':
        return
      case 'PhotoSize':
        return {
          type: 'default',
          thumbType: size.type as ThumbType,
          w: size.w,
          h: size.h,
          size: size.size,
        }
      case 'PhotoCachedSize':
        return {
          type: 'cached',
          thumbType: size.type as ThumbType,
          w: size.w,
          h: size.h,
          bytes: new Uint8Array(size.bytes),
        }
      case 'PhotoStrippedSize':
        return {
          type: 'stripped',
          thumbType: size.type as ThumbType,
          bytes: new Uint8Array(size.bytes),
        }
      case 'PhotoSizeProgressive':
        return {
          type: 'progressive',
          thumbType: size.type as ThumbType,
          w: size.w,
          h: size.h,
          sizes: size.sizes,
        }
      case 'PhotoPathSize':
        return {
          type: 'path',
          bytes: new Uint8Array(size.bytes),
        }
      default:
        return {
          type: 'unknown',
        }
    }
  }
)

const toVideoSize = withCleanUndef((size: Api.TypeVideoSize): VideoSizeData => {
  switch (size.className) {
    case 'VideoSize':
      return {
        type: 'default',
        videoType: size.type as VideoType,
        w: size.w,
        h: size.h,
        size: size.size,
        videoStartTs: size.videoStartTs,
      }
    case 'VideoSizeEmojiMarkup':
      return {
        type: 'emoji-markup',
        emoji: String(size.emojiId),
        backgroundColors: size.backgroundColors as RGB24Color,
      }
    case 'VideoSizeStickerMarkup':
      return {
        type: 'sticker-markup',
        stickerset: toStickerSetData(size.stickerset),
        sticker: String(size.stickerId),
        backgroundColors: size.backgroundColors as RGB24Color,
      }
    default:
      return {
        type: 'unknown',
      }
  }
})

const toStickerSetData = withCleanUndef(
  (stickerset: Api.TypeInputStickerSet): StickerSetData | undefined => {
    switch (stickerset.className) {
      case 'InputStickerSetEmpty':
        return
      case 'InputStickerSetID':
        return {
          type: 'id',
          id: String(stickerset.id),
          accessHash: String(stickerset.accessHash),
        }
      case 'InputStickerSetShortName':
        return {
          type: 'short-name',
          shortName: stickerset.shortName,
        }
      case 'InputStickerSetAnimatedEmoji':
        return {
          type: 'animated-emoji',
        }
      case 'InputStickerSetDice':
        return {
          type: 'dice',
          emoticon: stickerset.emoticon,
        }
      case 'InputStickerSetAnimatedEmojiAnimations':
        return {
          type: 'animated-emoji-animations',
        }
      case 'InputStickerSetPremiumGifts':
        return {
          type: 'premium-gifts',
        }
      case 'InputStickerSetEmojiGenericAnimations':
        return {
          type: 'emoji-generic-animations',
        }
      case 'InputStickerSetEmojiDefaultStatuses':
        return {
          type: 'emoji-default-statuses',
        }
      case 'InputStickerSetEmojiDefaultTopicIcons':
        return {
          type: 'emoji-default-topic-icons',
        }
      case 'InputStickerSetEmojiChannelDefaultStatuses':
        return {
          type: 'emoji-channel-default-statuses',
        }
      default:
        return {
          type: 'unknown',
        }
    }
  }
)

const toPaymentRequestedInfoData = withCleanUndef(
  (info: Api.PaymentRequestedInfo): PaymentRequestedInfoData => {
    return {
      name: info.name,
      phone: info.phone,
      email: info.email,
      shippingAddress:
        info.shippingAddress && toPostAddressData(info.shippingAddress),
    }
  }
)

const toPostAddressData = withCleanUndef(
  (address: Api.TypePostAddress): PostAddressData => {
    return {
      streetLine1: address.streetLine1,
      streetLine2: address.streetLine2,
      city: address.city,
      state: address.state,
      countryIso2: address.countryIso2,
      postCode: address.postCode,
    }
  }
)

const toPaymentChargeData = (charge: Api.PaymentCharge): PaymentChargeData => {
  return {
    id: String(charge.id),
    providerCharge: String(charge.providerChargeId),
  }
}

const toBotAppData = withCleanUndef((app: Api.TypeBotApp): BotAppData => {
  switch (app.className) {
    case 'BotApp':
      return {
        type: 'default',
        id: String(app.id),
        accessHash: String(app.accessHash),
        shortName: app.shortName,
        title: app.title,
        description: app.description,
        photo: app.photo && toPhotoData(app.photo),
        document: app.document && toDocumentData(app.document),
        hash: String(app.hash),
      }
    case 'BotAppNotModified':
      return {
        type: 'not-modified',
      }
    default:
      return {
        type: 'unknown',
      }
  }
})

const toDocumentData = withCleanUndef(
  (document: Api.TypeDocument): DocumentData | undefined => {
    if (document.className === 'DocumentEmpty') {
      return
    }
    return {
      id: String(document.id),
      accessHash: String(document.accessHash),
      fileReference: new Uint8Array(document.fileReference),
      date: document.date,
      mimeType: document.mimeType,
      size: document.size.toString(),
      thumbs: document.thumbs
        ?.map((s) => toPhotoSize(s))
        .filter((t) => t !== undefined) as Type.PhotoSizeData[],
      videoThumbs: document.videoThumbs
        ?.map((s) => toVideoSize(s))
        .filter((v) => v !== undefined) as Type.VideoSizeData[],
      dc: String(document.dcId),
      attributes: document.attributes
        .map((attr) => toDocumentAttributeData(attr))
        .filter((a) => a !== undefined) as Type.DocumentAttributeData[],
    }
  }
)

const toDocumentAttributeData = withCleanUndef(
  (attribute: Api.TypeDocumentAttribute): DocumentAttributeData => {
    switch (attribute.className) {
      case 'DocumentAttributeFilename':
        return {
          type: 'filename',
          fileName: attribute.fileName,
        }
      case 'DocumentAttributeAnimated':
        return {
          type: 'animated',
        }
      case 'DocumentAttributeHasStickers':
        return {
          type: 'has-stickers',
        }
      case 'DocumentAttributeSticker':
        return {
          type: 'sticker',
          mask: attribute.mask,
          alt: attribute.alt,
          stickerset: toStickerSetData(attribute.stickerset),
          maskCoords:
            attribute.maskCoords && toMaskCoordsData(attribute.maskCoords),
        }
      case 'DocumentAttributeVideo':
        return {
          type: 'video',
          roundMessage: attribute.roundMessage,
          supportsStreaming: attribute.supportsStreaming,
          nosound: attribute.nosound,
          duration: attribute.duration,
          w: attribute.w,
          h: attribute.h,
          preloadPrefixSize: attribute.preloadPrefixSize,
          videoStartTs: attribute.videoStartTs,
          videoCodec: attribute.videoCodec,
        }
      case 'DocumentAttributeAudio':
        return {
          type: 'audio',
          voice: attribute.voice,
          duration: attribute.duration,
          title: attribute.title,
          performer: attribute.performer,
          waveform: attribute.waveform && new Uint8Array(attribute.waveform),
        }
      case 'DocumentAttributeImageSize':
        return {
          type: 'image-size',
          w: attribute.w,
          h: attribute.h,
        }
      case 'DocumentAttributeCustomEmoji':
        return {
          type: 'custom-emoji',
          free: attribute.free,
          textColor: attribute.textColor,
          alt: attribute.alt,
          stickerset: toStickerSetData(attribute.stickerset),
        }
      default:
        return {
          type: 'unknown',
        }
    }
  }
)

const toMaskCoordsData = withCleanUndef(
  (maskCoords: Api.MaskCoords): MaskCoordsData => {
    return {
      n: maskCoords.n,
      x: maskCoords.x,
      y: maskCoords.y,
      zoom: maskCoords.zoom,
    }
  }
)

const toSecureValueData = withCleanUndef(
  (value: Api.TypeSecureValue): SecureValueData => {
    return {
      type: toSecureValueType(value.type),
      data: value.data && toSecureDataData(value.data),
      frontSide: value.frontSide && toSecureFileData(value.frontSide),
      reverseSide: value.reverseSide && toSecureFileData(value.reverseSide),
      selfie: value.selfie && toSecureFileData(value.selfie),
      translation: value.translation
        ?.map((doc) => toSecureFileData(doc))
        .filter(Boolean) as SecureFileData[],
      hash: new Uint8Array(value.hash),
    }
  }
)

const toSecureValueType = (type: Api.TypeSecureValueType): SecureValueType => {
  switch (type.className) {
    case 'SecureValueTypePersonalDetails':
      return 'personal-details'
    case 'SecureValueTypeAddress':
      return 'address'
    case 'SecureValueTypePhone':
      return 'phone'
    case 'SecureValueTypeEmail':
      return 'email'
    case 'SecureValueTypeIdentityCard':
      return 'identity-card'
    case 'SecureValueTypeDriverLicense':
      return 'driver-license'
    case 'SecureValueTypePassport':
      return 'passport'
    case 'SecureValueTypeInternalPassport':
      return 'internal-passport'
    case 'SecureValueTypeUtilityBill':
      return 'utility-bill'
    case 'SecureValueTypeBankStatement':
      return 'bank-statement'
    case 'SecureValueTypeRentalAgreement':
      return 'rental-agreement'
    case 'SecureValueTypePassportRegistration':
      return 'passport-registration'
    case 'SecureValueTypeTemporaryRegistration':
      return 'temporary-registration'
    default:
      return 'unknown'
  }
}

const toSecureDataData = (data: Api.SecureData): SecureDataData => {
  return {
    data: new Uint8Array(data.data),
    dataHash: new Uint8Array(data.dataHash),
    secret: new Uint8Array(data.secret),
  }
}

const toSecureFileData = withCleanUndef(
  (file: Api.TypeSecureFile): SecureFileData | undefined => {
    if (file.className === 'SecureFileEmpty') {
      return
    }
    return {
      id: String(file.id),
      accessHash: String(file.accessHash),
      size: String(file.size),
      dc: file.dcId,
      date: file.date,
      fileHash: new Uint8Array(file.fileHash),
      secret: new Uint8Array(file.secret),
    }
  }
)

const toSecureCredentialsEncryptedData = (
  credentials: Api.SecureCredentialsEncrypted
): SecureCredentialsEncryptedData => {
  return {
    data: new Uint8Array(credentials.data),
    hash: new Uint8Array(credentials.hash),
    secret: new Uint8Array(credentials.secret),
  }
}

const toInputGroupCallData = (call: Api.InputGroupCall): InputGroupCallData => {
  return {
    id: String(call.id),
    accessHash: String(call.accessHash),
  }
}

const toTextWithEntitiesData = withCleanUndef(
  (message: Api.TextWithEntities): TextWithEntitiesData => {
    return {
      text: message.text,
      entities: message.entities
        ?.map((entity) => toMessageEntityData(entity))
        .filter((e): e is Type.MessageEntityData => e !== undefined),
    }
  }
)

const toMessageEntityData = withCleanUndef(
  (entity: Api.TypeMessageEntity): MessageEntityData => {
    switch (entity.className) {
      case 'MessageEntityMention':
        return {
          type: 'mention',
          offset: entity.offset,
          length: entity.length,
        }
      case 'MessageEntityHashtag':
        return {
          type: 'hashtag',
          offset: entity.offset,
          length: entity.length,
        }
      case 'MessageEntityBotCommand':
        return {
          type: 'bot-command',
          offset: entity.offset,
          length: entity.length,
        }
      case 'MessageEntityUrl':
        return {
          type: 'url',
          offset: entity.offset,
          length: entity.length,
        }
      case 'MessageEntityEmail':
        return {
          type: 'email',
          offset: entity.offset,
          length: entity.length,
        }
      case 'MessageEntityBold':
        return {
          type: 'bold',
          offset: entity.offset,
          length: entity.length,
        }
      case 'MessageEntityItalic':
        return {
          type: 'italic',
          offset: entity.offset,
          length: entity.length,
        }
      case 'MessageEntityCode':
        return {
          type: 'code',
          offset: entity.offset,
          length: entity.length,
        }
      case 'MessageEntityPre':
        return {
          type: 'pre',
          offset: entity.offset,
          length: entity.length,
          language: entity.language,
        }
      case 'MessageEntityTextUrl':
        return {
          type: 'text-url',
          offset: entity.offset,
          length: entity.length,
          url: entity.url,
        }
      case 'MessageEntityMentionName':
        return {
          type: 'mention-name',
          offset: entity.offset,
          length: entity.length,
          user: String(entity.userId),
        }
      case 'MessageEntityPhone':
        return {
          type: 'phone',
          offset: entity.offset,
          length: entity.length,
        }
      case 'MessageEntityCashtag':
        return {
          type: 'cashtag',
          offset: entity.offset,
          length: entity.length,
        }
      case 'MessageEntityUnderline':
        return {
          type: 'underline',
          offset: entity.offset,
          length: entity.length,
        }
      case 'MessageEntityStrike':
        return {
          type: 'strike',
          offset: entity.offset,
          length: entity.length,
        }
      case 'MessageEntityBankCard':
        return {
          type: 'bank-card',
          offset: entity.offset,
          length: entity.length,
        }
      case 'MessageEntitySpoiler':
        return {
          type: 'spoiler',
          offset: entity.offset,
          length: entity.length,
        }
      case 'MessageEntityCustomEmoji':
        return {
          type: 'custom-emoji',
          offset: entity.offset,
          length: entity.length,
          document: String(entity.documentId),
        }
      case 'MessageEntityBlockquote':
        return {
          type: 'blockquote',
          offset: entity.offset,
          length: entity.length,
          collapsed: entity.collapsed,
        }
      default:
        return {
          type: 'unknown',
          offset: entity.offset,
          length: entity.length,
        }
    }
  }
)

const toWallPaperData = withCleanUndef(
  (wallpaper: Api.TypeWallPaper): WallPaperData => {
    switch (wallpaper.className) {
      case 'WallPaper':
        return {
          type: 'default',
          id: String(wallpaper.id),
          creator: wallpaper.creator,
          default: wallpaper.default,
          pattern: wallpaper.pattern,
          dark: wallpaper.dark,
          accessHash: String(wallpaper.accessHash),
          slug: wallpaper.slug,
          document: wallpaper.document && toDocumentData(wallpaper.document),
          settings:
            wallpaper.settings && toWallPaperSettingsData(wallpaper.settings),
        }
      case 'WallPaperNoFile':
        return {
          type: 'no-file',
          id: String(wallpaper.id),
          default: wallpaper.default,
          dark: wallpaper.dark,
          settings:
            wallpaper.settings && toWallPaperSettingsData(wallpaper.settings),
        }
      default:
        return {
          type: 'unknown',
        }
    }
  }
)

const toWallPaperSettingsData = withCleanUndef(
  (settings: Api.WallPaperSettings): WallPaperSettingsData => {
    return {
      blur: settings.blur,
      motion: settings.motion,
      backgroundColor: settings.backgroundColor,
      secondBackgroundColor: settings.secondBackgroundColor,
      thirdBackgroundColor: settings.thirdBackgroundColor,
      fourthBackgroundColor: settings.fourthBackgroundColor,
      intensity: settings.intensity,
      rotation: settings.rotation,
      emoticon: settings.emoticon,
    }
  }
)

const toRequestedPeerData = withCleanUndef(
  (peer: Api.TypeRequestedPeer): RequestedPeerData => {
    switch (peer.className) {
      case 'RequestedPeerUser':
        return {
          type: 'user',
          id: String(peer.userId),
          firstName: peer.firstName,
          lastName: peer.lastName,
          username: peer.username,
          photo: peer.photo && toPhotoData(peer.photo),
        }
      case 'RequestedPeerChat':
        return {
          type: 'chat',
          id: String(peer.chatId),
          title: peer.title,
          photo: peer.photo && toPhotoData(peer.photo),
        }
      case 'RequestedPeerChannel':
        return {
          type: 'channel',
          id: String(peer.channelId),
          title: peer.title,
          username: peer.username,
          photo: peer.photo && toPhotoData(peer.photo),
        }
      default:
        return {
          type: 'unknown',
        }
    }
  }
)

const toStarGiftData = withCleanUndef((gift: Api.StarGift): StarGiftData => {
  return {
    limited: gift.limited,
    soldOut: gift.soldOut,
    birthday: gift.birthday,
    id: String(gift.id),
    sticker: toDocumentData(gift.sticker),
    stars: String(gift.stars),
    availabilityRemains: gift.availabilityRemains,
    availabilityTotal: gift.availabilityTotal,
    convertStars: String(gift.convertStars),
    firstSaleDate: gift.firstSaleDate,
    lastSaleDate: gift.lastSaleDate,
  }
})

const ToGeoPointData = withCleanUndef(
  (geo: Api.TypeGeoPoint): Type.GeoPointData | undefined => {
    if (geo.className === 'GeoPointEmpty') {
      return
    }

    return {
      lat: geo.lat,
      long: geo.long,
      accessHash: String(geo.accessHash),
      accuracyRadius: geo.accuracyRadius,
    }
  }
)

// const ToBlockData = withCleanUndef((blocks: Api.TypePageBlock[]): Type.PageBlockData[] => {

// })

const ToPageData = withCleanUndef((page: Api.TypePage): Type.PageData => {
  return {
    part: page.part,
    rtl: page.rtl,
    v2: page.v2,
    url: page.url,
    blocks: [], // TODO: implement blocks: ToBlockData(page.blocks),
    photos: page.photos
      .map((p) => toPhotoData(p))
      .filter((p): p is PhotoData => p !== undefined),
    documents: page.documents
      .map((d) => toDocumentData(d))
      .filter((d): d is DocumentData => d !== undefined),
    views: page.views,
  }
})

const toWebPageData = withCleanUndef(
  (webPage: Api.TypeWebPage): Type.WebPageData | undefined => {
    switch (webPage.className) {
      case 'WebPageEmpty': {
        return
      }
      case 'WebPagePending': {
        return {
          type: 'pending',
          id: String(webPage.id),
          date: webPage.date,
          url: webPage.url,
        } as Type.WebPagePendingData
      }
      case 'WebPageNotModified': {
        return {
          type: 'not-modified',
          cachedPageViews: webPage.cachedPageViews,
        }
      }
      case 'WebPage': {
        return {
          type: 'default',
          id: String(webPage.id),
          url: webPage.url,
          displayUrl: webPage.displayUrl,
          hash: webPage.hash,
          hasLargeMedia: webPage.hasLargeMedia,
          tg_type: webPage.type,
          siteName: webPage.siteName,
          title: webPage.title,
          description: webPage.description,
          photo: webPage.photo && toPhotoData(webPage.photo),
          embedUrl: webPage.embedUrl,
          embedType: webPage.embedType,
          embedWidth: webPage.embedWidth,
          embedHeight: webPage.embedHeight,
          duration: webPage.duration,
          author: webPage.author,
          document: webPage.document && toDocumentData(webPage.document),
          cachedPage: webPage.cachedPage && ToPageData(webPage.cachedPage),
        } as Type.DefaultWebPageData
      }
    }
  }
)

const ToGameData = withCleanUndef((game: Api.TypeGame): Type.GameData => {
  return {
    id: String(game.id),
    title: game.title,
    description: game.description,
    shortName: game.shortName,
    accessHash: String(game.accessHash),
    photo: toPhotoData(game.photo)!,
    document: game.document && toDocumentData(game.document),
  }
})

const ToWebDocumentData = withCleanUndef(
  (document: Api.TypeWebDocument): Type.WebDocumentData => {
    switch (document.className) {
      case 'WebDocumentNoProxy': {
        return {
          type: 'proxy',
          url: document.url,
          size: document.size,
          mimeType: document.mimeType,
          attributes: document.attributes
            .map((d) => toDocumentAttributeData(d))
            .filter((d): d is Type.DocumentAttributeData => d !== undefined),
        }
      }
      case 'WebDocument': {
        return {
          type: 'default',
          url: document.url,
          size: document.size,
          mimeType: document.mimeType,
          accessHash: String(document.accessHash),
          attributes: document.attributes
            .map((d) => toDocumentAttributeData(d))
            .filter((d): d is Type.DocumentAttributeData => d !== undefined),
        }
      }
      default:
        return {
          type: 'unknown',
        }
    }
  }
)

const toPollAnswerData = withCleanUndef(
  (answer: Api.TypePollAnswer): Type.PollAnswerData => {
    return {
      text: toTextWithEntitiesData(answer.text),
      option: new Uint8Array(answer.option),
    }
  }
)

const toPollData = withCleanUndef((poll: Api.TypePoll): Type.PoolData => {
  return {
    id: String(poll.id),
    question: toTextWithEntitiesData(poll.question),
    answers: poll.answers.map((answer) => toPollAnswerData(answer)),
    closed: poll.closed,
    publicVoters: poll.publicVoters,
    multipleChoice: poll.multipleChoice,
    quiz: poll.quiz,
    closePeriod: poll.closePeriod,
    closeDate: poll.closeDate,
  }
})

const toPeerData = withCleanUndef((peer: Api.TypePeer): Type.PeerData => {
  switch (peer.className) {
    case 'PeerUser': {
      return {
        type: 'user',
        id: String(peer.userId),
      }
    }
    case 'PeerChat': {
      return {
        type: 'chat',
        id: String(peer.chatId),
      }
    }
    case 'PeerChannel': {
      return {
        type: 'channel',
        id: String(peer.channelId),
      }
    }
  }
})

const toPollAnswerVotersData = withCleanUndef(
  (answer: Api.TypePollAnswerVoters): Type.PollAnswerVotersData => {
    return {
      chosen: answer.chosen,
      correct: answer.correct,
      option: new Uint8Array(answer.option),
      voters: answer.voters,
    }
  }
)

const toPollResultsData = withCleanUndef(
  (results: Api.TypePollResults): Type.PollResultsData => {
    return {
      min: results.min,
      results: results.results
        ?.map((r) => toPollAnswerVotersData(r))
        .filter((r): r is Type.PollAnswerVotersData => r !== undefined),
      totalVoters: results.totalVoters,
      recentVoters: results.recentVoters?.map((peer) => toPeerData(peer)),
      solution: results.solution,
      solutionEntities: results.solutionEntities?.map((entity) =>
        toMessageEntityData(entity)
      ),
    }
  }
)

const toStoryViewData = withCleanUndef(
  (views: Api.TypeStoryViews): Type.StoryViewsData | undefined => {
    return {
      hasViewers: views.hasViewers,
      viewsCount: views.viewsCount,
      forwardsCount: views.forwardsCount,
      reactionsCount: views.reactionsCount,
      recentViewers: views.recentViewers?.map((peer) => String(peer)),
    }
  }
)

const toStoryItemData = withCleanUndef(
  (story: Api.TypeStoryItem): Type.StoryItemData => {
    switch (story.className) {
      case 'StoryItemDeleted': {
        return {
          type: 'deleted',
          id: story.id,
        } as Type.StoryItemDeletedData
      }
      case 'StoryItemSkipped': {
        return {
          type: 'skipped',
          id: story.id,
          date: story.date,
          expireDate: story.expireDate,
          closeFriends: story.closeFriends,
        } as Type.StoryItemSkippedData
      }
      case 'StoryItem': {
        return {
          type: 'default',
          id: story.id,
          date: story.date,
          expireDate: story.expireDate,
          pinned: story.pinned,
          public: story.public,
          closeFriends: story.closeFriends,
          min: story.min,
          noforwards: story.noforwards,
          edited: story.edited,
          contacts: story.contacts,
          selectedContacts: story.selectedContacts,
          out: story.out,
          caption: story.caption,
          from: story.fromId ? toPeerData(story.fromId) : undefined,
          media: toMediaData(story.media),
          entities: story.entities
            ?.map((entity) => toMessageEntityData(entity))
            .filter((e): e is Type.MessageEntityData => e !== undefined),
          views: story.views ? toStoryViewData(story.views) : undefined,
        } as Type.StoryItemDefaultData
      }
      default: {
        return {
          type: 'unknown',
        } as Type.StoryItemUnknownData
      }
    }
  }
)

const toExtendedMediaData = withCleanUndef(
  (media: Api.TypeMessageExtendedMedia): Type.ExtendedMediaData => {
    switch (media.className) {
      case 'MessageExtendedMedia': {
        return {
          type: 'default',
          media: toMediaData(media.media),
        } as Type.ExtendedMediaDefaultData
      }
      case 'MessageExtendedMediaPreview': {
        return {
          type: 'preview',
          w: media.w,
          h: media.h,
          thumb: media.thumb && toPhotoSize(media.thumb),
          videoDuration: media.videoDuration,
        } as Type.ExtendedMediaPreviewData
      }
      default: {
        return {
          type: 'unknown',
        } as Type.ExtendedMediaUnknownData
      }
    }
  }
)

const toMediaData = withCleanUndef(
  (media: Api.TypeMessageMedia): MediaData | undefined => {
    switch (media.className) {
      case 'MessageMediaEmpty':
        return
      case 'MessageMediaPhoto': {
        return {
          type: 'photo',
          photo: media.photo ? toPhotoData(media.photo) : undefined,
          spoiler: media.spoiler,
          ttlSeconds: media.ttlSeconds,
        } as Type.PhotoMediaData
      }
      case 'MessageMediaGeo': {
        return {
          type: 'geo',
          geo: ToGeoPointData(media.geo),
        } as Type.GeoMediaData
      }
      case 'MessageMediaContact': {
        return {
          type: 'contact',
          phoneNumber: media.phoneNumber,
          firstName: media.firstName,
          lastName: media.lastName,
          vcard: media.vcard,
          user: String(media.userId),
        } as Type.ContactMediaData
      }
      case 'MessageMediaUnsupported': {
        return {
          type: 'unsupported',
        } as Type.UnsupportedMediaData
      }
      case 'MessageMediaDocument': {
        return {
          type: 'document',
          document: media.document ? toDocumentData(media.document) : undefined,
          altDocuments: media.altDocuments
            ?.map((d) => toDocumentData(d))
            .filter((d): d is DocumentData => d !== undefined),
          nopremium: media.nopremium,
          spoiler: media.spoiler,
          video: media.video,
          round: media.round,
          voice: media.voice,
          ttlSeconds: media.ttlSeconds,
        } as Type.DocumentMediaData
      }
      case 'MessageMediaWebPage': {
        return {
          type: 'webpage',
          forceLargeMedia: media.forceLargeMedia,
          forceSmallMedia: media.forceSmallMedia,
          manual: media.manual,
          safe: media.safe,
          webpage: toWebPageData(media.webpage),
        } as Type.WebPageMediaData
      }
      case 'MessageMediaVenue': {
        return {
          type: 'venue',
          geo: ToGeoPointData(media.geo),
          title: media.title,
          address: media.address,
          provider: media.provider,
          venue: media.venueId,
          venueType: media.venueType,
        } as Type.VenueMediaData
      }
      case 'MessageMediaGame': {
        return {
          type: 'game',
          game: ToGameData(media.game),
        } as Type.GameMediaData
      }
      case 'MessageMediaInvoice': {
        return {
          type: 'invoice',
          title: media.title,
          description: media.description,
          startParam: media.startParam,
          currency: media.currency,
          totalAmount: String(media.totalAmount),
          test: media.test,
          receiptMsg: media.receiptMsgId,
          shippingAddressRequested: media.shippingAddressRequested,
          photo: media.photo && ToWebDocumentData(media.photo),
        }
      }
      case 'MessageMediaGeoLive': {
        return {
          type: 'geo-live',
          geo: ToGeoPointData(media.geo),
          period: media.period,
          heading: media.heading,
          proximityNotificationRadius: media.proximityNotificationRadius,
        } as Type.GeoLiveMediaData
      }
      case 'MessageMediaPoll': {
        return {
          type: 'poll',
          poll: toPollData(media.poll),
          results: toPollResultsData(media.results),
        } as Type.PollMediaData
      }
      case 'MessageMediaDice': {
        return {
          type: 'dice',
          value: media.value,
          emoticon: media.emoticon,
        } as Type.DiceMediaData
      }
      case 'MessageMediaStory': {
        return {
          type: 'story',
          id: media.id,
          peer: toPeerData(media.peer),
          viaMention: media.viaMention,
          story: media.story ? toStoryItemData(media.story) : undefined,
        } as Type.StoryMediaData
      }
      case 'MessageMediaGiveaway': {
        return {
          type: 'giveaway',
          onlyNewSubscribers: media.onlyNewSubscribers,
          winnersAreVisible: media.winnersAreVisible,
          channels: media.channels
            ?.map((c) => String(c))
            .filter((c) => c !== undefined),
          countriesIso2: media.countriesIso2,
          prizeDescription: media.prizeDescription,
          quantity: media.quantity,
          months: media.months,
          stars: String(media.stars),
          untilDate: media.untilDate,
        } as Type.GiveawayMediaData
      }
      case 'MessageMediaGiveawayResults': {
        return {
          type: 'giveaway-results',
          channel: String(media.channelId),
          launchMsg: media.launchMsgId,
          winnersCount: media.winnersCount,
          unclaimedCount: media.unclaimedCount,
          winners: media.winners
            ?.map((w) => String(w))
            .filter((w) => w !== undefined),
          untilDate: media.untilDate,
          onlyNewSubscribers: media.onlyNewSubscribers,
          refunded: media.refunded,
          additionalPeersCount: media.additionalPeersCount,
          months: media.months,
          stars: String(media.stars),
          prizeDescription: media.prizeDescription,
        } as Type.GiveawayResultsMediaData
      }
      case 'MessageMediaPaidMedia': {
        return {
          type: 'paid-media',
          starsAmount: String(media.starsAmount),
          extendedMedia: media.extendedMedia
            ?.map((m) => toExtendedMediaData(m))
            .filter((m): m is Type.ExtendedMediaData => m !== undefined),
        } as Type.PaidMediaData
      }
      default: {
        return {
          type: 'unknown',
        }
      }
    }
  }
)
