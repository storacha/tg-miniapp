import {
  Block,
  ByteView,
  Link,
  ToString,
  UnknownLink,
  Variant,
  DID,
} from '@ucanto/client'
import { identity } from 'multiformats/hashes/identity'
export type { Block, ByteView, Link, ToString, UnknownLink, Variant }

export type SpaceDID = DID<'key'>
export type UnknownBlock = Block<unknown, number, number, 0 | 1>

export type AbsolutePeriod = [from: number, to: number]

/**
 * A period is either a specific to and from time or just a from time with
 * implicit to - now. Values are expressed as seconds since unix epoch.
 */
export type Period = AbsolutePeriod | [from: number]

export type JobID = string

export type DialogsById = Record<ToString<EntityID>, Omit<DialogInfo, 'id'>>
export interface JobParams {
  /** The space the data is being saved to. */
  space: SpaceDID
  /** The dialogs that will be backed up. */
  dialogs: DialogsById
  /** Time period this backup covers. */
  period: AbsolutePeriod
}

export type JobStatus =
  | 'waiting'
  | 'queued'
  | 'running'
  | 'failed'
  | 'canceled'
  | 'completed'

/** A backup job. */
export type Job =
  | WaitingJob
  | QueuedJob
  | RunningJob
  | FailedJob
  | CompletedJob
  | CanceledJob

/** A backup job with fields common to jobs in all statuses. */
export interface BaseJob {
  /** Unique identifier for the job. */
  id: JobID
  status: JobStatus
  /** Parameters for the job. */
  params: JobParams
  /** Timestamp of when this backup job was created. */
  created: number
  /** Timestamp of when this backup job was last updated. */
  updated: number
}

/** A backup job that is waiting to be queued and run. */
export interface WaitingJob extends BaseJob {
  status: 'waiting'
}

/** A backup job that has been queued for running. */
export interface QueuedJob extends BaseJob {
  status: 'queued'
}

/** A backup job that is canceled by the user. */
export interface CanceledJob extends BaseJob {
  status: 'canceled'
  /** Indication of completion progress - a number between 0 and 1 or null. */
  progress?: number
  /** Timestamp of when this backup was started. I may not exist. */
  started?: number
  /** Timestamp of when this backup was canceled. */
  finished: number
}

/** A running backup job. */
export interface RunningJob extends BaseJob {
  status: 'running'
  /** Indication of completion progress - a number between 0 and 1. */
  progress: number
  /** Timestamp of when this backup was started. */
  started: number
}

/** A backup job that failed before successful completion. */
export interface FailedJob extends BaseJob {
  status: 'failed'
  /** Indication of completion progress - a number between 0 and 1. */
  progress: number
  /** Cause of the failure. */
  cause: string
  /** Timestamp of when this backup was started (set if it started). */
  started?: number
  /** Timestamp of when this backup failed. */
  finished: number
}

/** A completed backup. */
export interface CompletedJob extends BaseJob {
  status: 'completed'
  /** Link to the actual backup data. */
  data: string
  /** Timestamp of when this backup was started. */
  started: number
  /** Timestamp of when this backup completed successfully. */
  finished: number
}

/** Backups are backup jobs that have completed successfully. */
export type Backup = CompletedJob

export type PendingJob =
  | WaitingJob
  | QueuedJob
  | RunningJob
  | FailedJob
  | CanceledJob

export interface Page<T> {
  items: T[]
}

export interface JobStorage extends EventTarget {
  find: (id: JobID) => Promise<Job | null>
  listPending: () => Promise<
    Page<WaitingJob | QueuedJob | RunningJob | FailedJob>
  >
  listCompleted: () => Promise<Page<CompletedJob>>
  add: (dialogs: DialogsById, period: Period) => Promise<Job>
  remove: (id: JobID) => Promise<void>
  cancel: (id: JobID) => Promise<void>
  deleteDialog: (id: JobID, dialogID: ToString<EntityID>) => Promise<void>
}

export interface TelegramAuth {
  session: string
  initData: string
}

export interface LoginRequest {
  spaceDID: SpaceDID
  telegramAuth: TelegramAuth
}

export interface ExecuteAuth {
  spaceDelegation: Uint8Array
  encryptionPassword: string
}
export interface ExecuteJobRequest extends ExecuteAuth, LoginRequest {
  jobID: JobID
}

export interface DeleteDialogFromJob extends ExecuteAuth, LoginRequest {
  jobID: JobID
  dialogID: ToString<EntityID>
}

export interface DeleteDialogFromJobRequest extends ExecuteAuth {
  jobID: JobID
  dialogID: ToString<EntityID>
}

export interface CreateJobRequest extends ExecuteAuth {
  dialogs: DialogsById
  period: Period
}

// An interface declaring no members is equivalent to its supertype.
// we can change this later when it is not empty
export type ListJobsRequest = object

export interface FindJobRequest {
  jobID: JobID
}

export interface RemoveJobRequest {
  jobID: JobID
}

export interface CancelJobRequest {
  jobID: JobID
}

export interface JobClient {
  createJob: (jr: CreateJobRequest) => Promise<Job>
  findJob: (jr: FindJobRequest) => Promise<Job>
  listJobs: (jr: ListJobsRequest) => Promise<Job[]>
  removeJob: (jr: RemoveJobRequest) => Promise<Job>
  cancelJob: (jr: CancelJobRequest) => Promise<Job>
  deleteDialogFromJob: (jr: DeleteDialogFromJobRequest) => Promise<void>
}

export interface Encrypter {
  encrypt: <T>(data: ByteView<T>) => Promise<EncryptedByteView<T>>
}

export interface Decrypter {
  decrypt: <T>(data: EncryptedByteView<T>) => Promise<ByteView<T>>
}

export interface Cipher extends Encrypter, Decrypter {}

export type BackupModel = Variant<{
  'tg-miniapp-backup@0.0.1': BackupData
}>

/** A Telegram entity ID. */
export type EntityID = bigint
export type PhotoID = bigint
export type MessageID = number

/**
 * Some encrypted data.
 *
 * Note: encrypted data is encoded as a UnixFS DAG.
 */
export interface EncryptedByteView<T> extends ByteView<T> {}

/** Some data tagged with an IPLD codec and encoded as a V1 CID. */
export interface TaggedByteView<T>
  extends ByteView<Link<T, number, typeof identity.code, 1>> {}

/**
 * Some encrypted data tagged with an IPLD codec and encoded as a V1 CID.
 *
 * Note: encrypted data is encoded as a UnixFS DAG.
 */
export interface EncryptedTaggedByteView<T> extends TaggedByteView<T> {}

export interface BackupData {
  /** The dialogs available in this backup. */
  dialogs: Record<ToString<EntityID>, Link<EncryptedTaggedByteView<DialogData>>>
  /** The period this backup covers. */
  period: AbsolutePeriod
}

export type DialogDataMessages = Array<
  Link<EncryptedTaggedByteView<Array<MessageData | ServiceMessageData>>>
>

export interface DialogData extends EntityData {
  /** A link to the entities that participated in this dialog. */
  entities: Link<EncryptedTaggedByteView<EntityRecordData>>
  /**
   * An array of links to lists of ordered messages sent by entities
   * participating in this dialog.
   *
   * Messages are ordered newest to oldest.
   *
   * Each list has a maximum of 1,000 messages.
   */
  messages: DialogDataMessages
}

export interface SizeRewardInfo {
  size: number
  points: number
}
export interface DialogInfo extends EntityData {
  initials: string
  isPublic: boolean
  /** This is the entity ID + a prefix indicating the type of dialog */
  dialogId?: ToString<EntityID>
  accessHash?: string
  sizeRewardInfo?: SizeRewardInfo
}

export type EntityRecordData = Record<ToString<EntityID>, EntityData>

export type EntityType = 'user' | 'chat' | 'channel' | 'unknown'

export interface EntityData {
  id: ToString<EntityID>
  /** Type of the entity. */
  type: EntityType
  /** Normalized name of the entity. */
  name: string
  /** Photo for the entity. */
  photo?: {
    id: ToString<PhotoID>
    strippedThumb?: Uint8Array
  }
}
export interface PeerData {
  type: EntityType
  id: ToString<EntityID>
}
export interface MessageMedia {
  content?: Link<EncryptedTaggedByteView<Uint8Array>>
  metadata: MediaData
}
export interface MessageData {
  id: MessageID
  type: 'message'
  /**
   * ID of the peer who sent this message. Will be undefined for anonymous messages.
   * Indicates the sender of the message.
   *
   * In a private chat, this is usually undefined since the context already implies the sender.
   */
  from?: ToString<EntityID>

  /**
   * ID of the peer (chat, user, or channel) where the message was sent.
   * Indicates the destination or context of the message.
   *
   * In a private chat, this will be the ID of the other user you're chatting with.
   */
  peer: ToString<EntityID>
  /** Timestamp in seconds since Unix epoch that this message was sent. */
  date: number
  /** The string text of the message. */
  message: string
  media?: MessageMedia
}
export interface ServiceMessageData {
  id: MessageID
  type: 'service'
  /**
   * ID of the peer who sent this message. It will be undefined for anonymous
   * messages.
   */
  from?: ToString<EntityID>
  /** Timestamp in seconds since Unix epoch that this message was sent. */
  date: number
  /** The message action. */
  action: ActionData
}

export type ActionData =
  | ChatCreateActionData
  | ChatEditTitleActionData
  | ChatEditPhotoActionData
  | ChatDeletePhotoActionData
  | ChatAddUserActionData
  | ChatDeleteUserActionData
  | ChatJoinedByLinkActionData
  | ChannelCreateActionData
  | ChatMigrateToActionData
  | ChannelMigrateFromActionData
  | PinMessageActionData
  | HistoryClearActionData
  | GameScoreActionData
  | PaymentSentMeActionData
  | PaymentSentActionData
  | PhoneCallActionData
  | ScreenshotTakenActionData
  | CustomActionActionData
  | BotAllowedActionData
  | SecureValuesSentMeActionData
  | SecureValuesSentActionData
  | ContactSignUpActionData
  | GeoProximityReachedActionData
  | GroupCallActionData
  | InviteToGroupCallActionData
  | SetMessagesTTLActionData
  | GroupCallScheduledActionData
  | SetChatThemeActionData
  | ChatJoinedByRequestActionData
  | WebViewDataSentMeActionData
  | WebViewDataSentActionData
  | GiftPremiumActionData
  | TopicCreateActionData
  | TopicEditActionData
  | SuggestProfilePhotoActionData
  | RequestedPeerActionData
  | SetChatWallPaperActionData
  | GiftCodeActionData
  | GiveawayLaunchActionData
  | GiveawayResultsActionData
  | BoostApplyActionData
  | RequestedPeerSentMeActionData
  | PaymentRefundedActionData
  | GiftStarsActionData
  | PrizeStarsActionData
  | StarGiftActionData
  | UnknownActionData

export interface ChatCreateActionData {
  type: 'chat-create'
  title: string
  users: ToString<EntityID>[]
}

export interface ChatEditTitleActionData {
  type: 'chat-edit-title'
  title: string
}

/** @see https://core.telegram.org/api/files#image-thumbnail-types */
export type ThumbType =
  | 's'
  | 'm'
  | 'x'
  | 'y'
  | 'w'
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'i'
  | 'j'

export type PhotoSizeData =
  | DefaultPhotoSizeData
  | CachedPhotoSizeData
  | StrippedPhotoSizeData
  | ProgressivePhotoSizeData
  | PathPhotoSizeData
  | UnknownPhotoSizeData

export interface DefaultPhotoSizeData {
  type: 'default'
  /**
   * Indicator for resolution and image transform that was applied server-side.
   * @see https://core.telegram.org/api/files#image-thumbnail-types
   */
  thumbType: ThumbType
  w: number
  h: number
  /** File size */
  size: number
}

export interface CachedPhotoSizeData {
  type: 'cached'
  /**
   * Indicator for resolution and image transform that was applied server-side.
   * @see https://core.telegram.org/api/files#image-thumbnail-types
   */
  thumbType: ThumbType
  w: number
  h: number
  /** Binary data, file content */
  bytes: Uint8Array
}

export interface StrippedPhotoSizeData {
  type: 'stripped'
  /**
   * Indicator for resolution and image transform that was applied server-side.
   * @see https://core.telegram.org/api/files#image-thumbnail-types
   */
  thumbType: ThumbType
  /**
   * A low-resolution compressed JPG payload.
   * @see https://core.telegram.org/api/files#stripped-thumbnails
   */
  bytes: Uint8Array
}

export interface ProgressivePhotoSizeData {
  type: 'progressive'
  /**
   * Indicator for resolution and image transform that was applied server-side.
   * @see https://core.telegram.org/api/files#image-thumbnail-types
   */
  thumbType: ThumbType
  w: number
  h: number
  /** Sizes of progressive JPEG file prefixes, which can be used to preliminarily show the image. */
  sizes: number[]
}

export interface PathPhotoSizeData {
  type: 'path'
  /**
   * Compressed SVG path payload.
   * @see https://core.telegram.org/api/files#vector-thumbnails
   */
  bytes: Uint8Array
}

export interface UnknownPhotoSizeData {
  type: 'unknown'
}

/** @see https://core.telegram.org/api/files#video-types */
export type VideoType = 'u' | 'v' | 'f'

export type VideoSizeData =
  | DefaultVideoSizeData
  | EmojiMarkupVideoSizeData
  | StickerMarkupVideoSizeData
  | UnknownVideoSizeData

export interface DefaultVideoSizeData {
  type: 'default'
  videoType: VideoType
  w: number
  h: number
  size: number
  /** Timestamp that should be shown as static preview to the user (seconds). */
  videoStartTs?: number
}

export type RGB24Color =
  | [number]
  | [number, number]
  | [number, number, number]
  | [number, number, number, number]

export interface EmojiMarkupVideoSizeData {
  type: 'emoji-markup'
  /**
   * The custom emoji sticker is shown at the center of the profile picture and
   * occupies at most 67% of it.
   *
   * @see https://core.telegram.org/api/custom-emoji
   */
  emoji: ToString<bigint>
  /**
   * 1, 2, 3 or 4 RBG-24 colors used to generate a solid (1), gradient (2) or
   * freeform gradient (3, 4) background, similar to how fill wallpapers are
   * generated. The rotation angle for gradient backgrounds is 0.
   */
  backgroundColors: RGB24Color
}

export interface IDStickerSetData {
  type: 'id'
  id: ToString<bigint>
  accessHash: ToString<bigint>
}

export interface ShortNameStickerSetData {
  type: 'short-name'
  shortName: string
}

export interface AnimatedEmojiStickerSetData {
  type: 'animated-emoji'
}

export interface DiceStickerSetData {
  type: 'dice'
  emoticon: string
}

export interface AnimatedEmojiAnimationsStickerSetData {
  type: 'animated-emoji-animations'
}

export interface PremiumGiftsStickerSetData {
  type: 'premium-gifts'
}

export interface EmojiGenericAnimationsStickerSetData {
  type: 'emoji-generic-animations'
}

export interface EmojiDefaultStatusesStickerSetData {
  type: 'emoji-default-statuses'
}

export interface EmojiDefaultTopicIconsStickerSetData {
  type: 'emoji-default-topic-icons'
}

export interface EmojiChannelDefaultStatusesStickerSetData {
  type: 'emoji-channel-default-statuses'
}

export interface UnknownStickerSetData {
  type: 'unknown'
}

export type StickerSetData =
  | IDStickerSetData
  | ShortNameStickerSetData
  | AnimatedEmojiStickerSetData
  | DiceStickerSetData
  | AnimatedEmojiAnimationsStickerSetData
  | PremiumGiftsStickerSetData
  | EmojiGenericAnimationsStickerSetData
  | EmojiDefaultStatusesStickerSetData
  | EmojiDefaultTopicIconsStickerSetData
  | EmojiChannelDefaultStatusesStickerSetData
  | UnknownStickerSetData

export interface StickerMarkupVideoSizeData {
  type: 'sticker-markup'
  stickerset?: StickerSetData
  sticker: ToString<bigint>
  /**
   * 1, 2, 3 or 4 RBG-24 colors used to generate a solid (1), gradient (2) or
   * freeform gradient (3, 4) background, similar to how fill wallpapers are
   * generated. The rotation angle for gradient backgrounds is 0.
   */
  backgroundColors: RGB24Color
}

export interface UnknownVideoSizeData {
  type: 'unknown'
}

export type PhotoData = DefaultPhotoData | UnknownPhotoData

export interface UnknownPhotoData {
  type: 'unknown'
}

export interface DefaultPhotoData {
  type: 'default'
  id: ToString<PhotoID>
  hasStickers?: boolean
  accessHash: ToString<bigint>
  fileReference: Uint8Array
  date: number
  sizes: PhotoSizeData[]
  videoSizes?: VideoSizeData[]
  dc?: number
}

export interface ChatEditPhotoActionData {
  type: 'chat-edit-photo'
  photo?: PhotoData
}

export interface ChatDeletePhotoActionData {
  type: 'chat-delete-photo'
}

export interface ChatAddUserActionData {
  type: 'chat-add-user'
  users: ToString<EntityID>[]
}

export interface ChatDeleteUserActionData {
  type: 'chat-delete-user'
  user: ToString<EntityID>
}

export interface ChatJoinedByLinkActionData {
  type: 'chat-joined-by-link'
  inviter: ToString<EntityID>
}

export interface ChannelCreateActionData {
  type: 'channel-create'
  title: ToString<EntityID>
}

export interface ChatMigrateToActionData {
  type: 'chat-migrate-to'
  channel: ToString<EntityID>
}

export interface ChannelMigrateFromActionData {
  type: 'channel-migrate-from'
  title: string
  chat: ToString<EntityID>
}

export interface PinMessageActionData {
  type: 'pin-message'
}

export interface HistoryClearActionData {
  type: 'history-clear'
}

export interface GameScoreActionData {
  type: 'game-score'
  game: ToString<bigint>
  score: number
}

export interface PostAddressData {
  streetLine1: string
  streetLine2: string
  city: string
  state: string
  countryIso2: string
  postCode: string
}

export interface PaymentRequestedInfoData {
  name?: string
  phone?: string
  email?: string
  shippingAddress?: PostAddressData
}

export interface PaymentChargeData {
  id: string
  providerCharge: string
}

export interface PaymentSentMeActionData {
  type: 'payment-sent-me'
  recurringInit?: boolean
  recurringUsed?: boolean
  currency: string
  totalAmount: ToString<bigint>
  payload: Uint8Array
  info?: PaymentRequestedInfoData
  shippingOptionId?: string
  charge: PaymentChargeData
}

export interface PaymentSentActionData {
  type: 'payment-sent'
  recurringInit?: boolean
  recurringUsed?: boolean
  currency: string
  totalAmount: ToString<bigint>
  invoiceSlug?: string
}

export type PhoneCallDiscardReason =
  | 'missed'
  | 'disconnect'
  | 'hangup'
  | 'busy'
  | 'unknown'

export interface PhoneCallActionData {
  type: 'phone-call'
  video?: boolean
  call: ToString<bigint>
  reason?: PhoneCallDiscardReason
  duration?: number
}

export interface ScreenshotTakenActionData {
  type: 'screenshot-taken'
}

export interface CustomActionActionData {
  type: 'custom-action'
  message: string
}

export interface NotModifiedBotAppData {
  type: 'not-modified'
}

export interface ImageSizeDocumentAttributeData {
  type: 'image-size'
  w: number
  h: number
}

export interface AnimatedDocumentAttributeData {
  type: 'animated'
}

export interface MaskCoordsData {
  n: number
  x: number
  y: number
  zoom: number
}

export interface StickerDocumentAttributeData {
  type: 'sticker'
  mask?: boolean
  alt: string
  stickerset?: StickerSetData
  maskCoords?: MaskCoordsData
}

export interface VideoDocumentAttributeData {
  type: 'video'
  roundMessage?: boolean
  supportsStreaming?: boolean
  nosound?: boolean
  duration: number
  w: number
  h: number
  preloadPrefixSize?: number
  videoStartTs?: number
  videoCodec?: string
}

export interface AudioDocumentAttributeData {
  type: 'audio'
  voice?: boolean
  duration: number
  title?: string
  performer?: string
  waveform?: Uint8Array
}

export interface FilenameDocumentAttributeData {
  type: 'filename'
  fileName: string
}

export interface HasStickersDocumentAttributeData {
  type: 'has-stickers'
}

export interface CustomEmojiDocumentAttributeData {
  type: 'custom-emoji'
  free?: boolean
  textColor?: boolean
  alt: string
  stickerset?: StickerSetData
}

export interface UnknownDocumentAttributeData {
  type: 'unknown'
}

export type DocumentAttributeData =
  | ImageSizeDocumentAttributeData
  | AnimatedDocumentAttributeData
  | StickerDocumentAttributeData
  | VideoDocumentAttributeData
  | AudioDocumentAttributeData
  | FilenameDocumentAttributeData
  | HasStickersDocumentAttributeData
  | CustomEmojiDocumentAttributeData
  | UnknownDocumentAttributeData

export interface DocumentData {
  id: ToString<bigint>
  accessHash: ToString<bigint>
  fileReference: Uint8Array
  date: number
  mimeType: string
  size: ToString<bigint>
  thumbs?: PhotoSizeData[]
  videoThumbs?: VideoSizeData[]
  dc: ToString<bigint>
  attributes: DocumentAttributeData[]
}

export interface DefaultBotAppData {
  type: 'default'
  id: ToString<bigint>
  accessHash: ToString<bigint>
  shortName: string
  title: string
  description: string
  photo?: PhotoData
  document?: DocumentData
  hash: ToString<bigint>
}

export interface UnknownBotAppData {
  type: 'unknown'
}

export type BotAppData =
  | DefaultBotAppData
  | NotModifiedBotAppData
  | UnknownBotAppData

export interface BotAllowedActionData {
  type: 'bot-allowed'
  attachMenu?: boolean
  fromRequest?: boolean
  domain?: string
  app?: BotAppData
}

export type SecureValueType =
  | 'personal-details'
  | 'passport'
  | 'driver-license'
  | 'identity-card'
  | 'internal-passport'
  | 'address'
  | 'utility-bill'
  | 'bank-statement'
  | 'rental-agreement'
  | 'passport-registration'
  | 'temporary-registration'
  | 'phone'
  | 'email'
  | 'unknown'

export interface SecureDataData {
  data: Uint8Array
  dataHash: Uint8Array
  secret: Uint8Array
}

export interface SecureFileData {
  id: ToString<bigint>
  accessHash: ToString<bigint>
  size: ToString<bigint>
  dc: number
  date: number
  fileHash: Uint8Array
  secret: Uint8Array
}

export interface PhoneSecurePlainDataData {
  type: 'phone'
  phone: string
}

export interface EmailSecurePlainDataData {
  type: 'email'
  email: string
}

export interface UnknownSecurePlainDataData {
  type: 'unknown'
}

export type SecurePlainDataData =
  | PhoneSecurePlainDataData
  | EmailSecurePlainDataData
  | UnknownSecurePlainDataData

export interface SecureValueData {
  type: SecureValueType
  data?: SecureDataData
  frontSide?: SecureFileData
  reverseSide?: SecureFileData
  selfie?: SecureFileData
  translation?: SecureFileData[]
  files?: SecureFileData[]
  plainData?: SecurePlainDataData
  hash: Uint8Array
}

export interface SecureCredentialsEncryptedData {
  data: Uint8Array
  hash: Uint8Array
  secret: Uint8Array
}

export interface SecureValuesSentMeActionData {
  type: 'secure-values-sent-me'
  values: SecureValueData[]
  credentials: SecureCredentialsEncryptedData
}

export interface SecureValuesSentActionData {
  type: 'secure-values-sent'
  types: SecureValueType[]
}

export interface ContactSignUpActionData {
  type: 'contact-sign-up'
}

export interface GeoProximityReachedActionData {
  type: 'geo-proximity-reached'
  from: ToString<EntityID>
  to: ToString<EntityID>
  distance: number
}

export interface InputGroupCallData {
  id: ToString<bigint>
  accessHash: ToString<bigint>
}

export interface GroupCallActionData {
  type: 'group-call'
  call: InputGroupCallData
  duration?: number
}

export interface InviteToGroupCallActionData {
  type: 'invite-to-group-call'
  call: InputGroupCallData
  users: ToString<EntityID>[]
}

export interface SetMessagesTTLActionData {
  type: 'set-messages-ttl'
  period: number
  autoSettingFrom?: ToString<bigint>
}

export interface GroupCallScheduledActionData {
  type: 'group-call-scheduled'
  call: InputGroupCallData
  scheduleDate: number
}

export interface SetChatThemeActionData {
  type: 'set-chat-theme'
  emoticon: string
}

export interface ChatJoinedByRequestActionData {
  type: 'chat-joined-by-request'
}

export interface WebViewDataSentMeActionData {
  type: 'web-view-data-sent-me'
  text: string
  data: string
}

export interface WebViewDataSentActionData {
  type: 'web-view-data-sent'
  text: string
}

export interface UnknownMessageEntityData {
  type: 'unknown'
  offset: number
  length: number
}

export interface MentionMessageEntityData {
  type: 'mention'
  offset: number
  length: number
}

export interface HashtagMessageEntityData {
  type: 'hashtag'
  offset: number
  length: number
}

export interface BotCommandMessageEntityData {
  type: 'bot-command'
  offset: number
  length: number
}

export interface UrlMessageEntityData {
  type: 'url'
  offset: number
  length: number
}

export interface EmailMessageEntityData {
  type: 'email'
  offset: number
  length: number
}

export interface BoldMessageEntityData {
  type: 'bold'
  offset: number
  length: number
}

export interface ItalicMessageEntityData {
  type: 'italic'
  offset: number
  length: number
}

export interface CodeMessageEntityData {
  type: 'code'
  offset: number
  length: number
}

export interface PreMessageEntityData {
  type: 'pre'
  offset: number
  length: number
  language: string
}

export interface TextUrlMessageEntityData {
  type: 'text-url'
  offset: number
  length: number
  url: string
}

export interface MentionNameMessageEntityData {
  type: 'mention-name'
  offset: number
  length: number
  user: ToString<EntityID>
}

export interface PhoneMessageEntityData {
  type: 'phone'
  offset: number
  length: number
}

export interface CashtagMessageEntityData {
  type: 'cashtag'
  offset: number
  length: number
}

export interface UnderlineMessageEntityData {
  type: 'underline'
  offset: number
  length: number
}

export interface StrikeMessageEntityData {
  type: 'strike'
  offset: number
  length: number
}

export interface BankCardMessageEntityData {
  type: 'bank-card'
  offset: number
  length: number
}

export interface SpoilerMessageEntityData {
  type: 'spoiler'
  offset: number
  length: number
}

export interface CustomEmojiMessageEntityData {
  type: 'custom-emoji'
  offset: number
  length: number
  document: ToString<bigint>
}

export interface BlockquoteMessageEntityData {
  type: 'blockquote'
  offset: number
  length: number
  collapsed?: boolean
}

export type MessageEntityData =
  | UnknownMessageEntityData
  | MentionMessageEntityData
  | HashtagMessageEntityData
  | BotCommandMessageEntityData
  | UrlMessageEntityData
  | EmailMessageEntityData
  | BoldMessageEntityData
  | ItalicMessageEntityData
  | CodeMessageEntityData
  | PreMessageEntityData
  | TextUrlMessageEntityData
  | MentionNameMessageEntityData
  | PhoneMessageEntityData
  | CashtagMessageEntityData
  | UnderlineMessageEntityData
  | StrikeMessageEntityData
  | BankCardMessageEntityData
  | SpoilerMessageEntityData
  | CustomEmojiMessageEntityData
  | BlockquoteMessageEntityData

export interface TextWithEntitiesData {
  text: string
  entities: MessageEntityData[]
}

export interface GiftPremiumActionData {
  type: 'gift-premium'
  currency: string
  amount: ToString<bigint>
  months: number
  cryptoCurrency?: string
  cryptoAmount?: ToString<bigint>
  message?: TextWithEntitiesData
}

export interface TopicCreateActionData {
  type: 'topic-create'
  title: string
  iconColor: number
  iconEmoji?: ToString<bigint>
}

export interface TopicEditActionData {
  type: 'topic-edit'
  title?: string
  iconEmoji?: ToString<bigint>
  closed?: boolean
  hidden?: boolean
}

export interface SuggestProfilePhotoActionData {
  type: 'suggest-profile-photo'
  photo?: PhotoData
}

export interface RequestedPeerActionData {
  type: 'requested-peer'
  button: number
  peers: ToString<EntityID>[]
}

export interface WallPaperSettingsData {
  blur?: boolean
  motion?: boolean
  backgroundColor?: number
  secondBackgroundColor?: number
  thirdBackgroundColor?: number
  fourthBackgroundColor?: number
  intensity?: number
  rotation?: number
  emoticon?: string
}

export interface DefaultWallPaperData {
  type: 'default'
  id: ToString<bigint>
  creator?: boolean
  default?: boolean
  pattern?: boolean
  dark?: boolean
  accessHash: ToString<bigint>
  slug: string
  document?: DocumentData
  settings?: WallPaperSettingsData
}

export interface NoFileWallPaperData {
  type: 'no-file'
  id: ToString<bigint>
  default?: boolean
  dark?: boolean
  settings?: WallPaperSettingsData
}

export interface UnknownWallPaperData {
  type: 'unknown'
}

export type WallPaperData =
  | DefaultWallPaperData
  | NoFileWallPaperData
  | UnknownWallPaperData

export interface SetChatWallPaperActionData {
  type: 'set-chat-wall-paper'
  same?: boolean
  forBoth?: boolean
  wallpaper: WallPaperData
}

export interface GiftCodeActionData {
  type: 'gift-code'
  viaGiveaway?: boolean
  unclaimed?: boolean
  boostPeer?: ToString<EntityID>
  months: number
  slug: string
  currency?: string
  amount?: ToString<bigint>
  cryptoCurrency?: string
  cryptoAmount?: ToString<bigint>
  message?: TextWithEntitiesData
}

export interface GiveawayLaunchActionData {
  type: 'giveaway-launch'
  stars?: ToString<bigint>
}

export interface GiveawayResultsActionData {
  type: 'giveaway-results'
  stars?: boolean
  winnersCount: number
  unclaimedCount: number
}

export interface BoostApplyActionData {
  type: 'boost-apply'
  boosts: number
}

export interface UserRequestedPeerData {
  type: 'user'
  id: ToString<EntityID>
  firstName?: string
  lastName?: string
  username?: string
  photo?: PhotoData
}

export interface ChatRequestedPeerData {
  type: 'chat'
  id: ToString<EntityID>
  title?: string
  photo?: PhotoData
}

export interface ChannelRequestedPeerData {
  type: 'channel'
  id: ToString<EntityID>
  title?: string
  username?: string
  photo?: PhotoData
}

export interface UnknownRequestedPeerData {
  type: 'unknown'
}

export type RequestedPeerData =
  | UserRequestedPeerData
  | ChatRequestedPeerData
  | ChannelRequestedPeerData
  | UnknownRequestedPeerData

export interface RequestedPeerSentMeActionData {
  type: 'requested-peer-sent-me'
  button: number
  peers: RequestedPeerData[]
}

export interface PaymentRefundedActionData {
  type: 'payment-refunded'
  peer: ToString<EntityID>
  currency: string
  totalAmount: ToString<bigint>
  payload?: Uint8Array
  charge: PaymentChargeData
}

export interface GiftStarsActionData {
  type: 'gift-stars'
  currency: string
  amount: ToString<bigint>
  stars: ToString<bigint>
  cryptoCurrency?: string
  cryptoAmount?: ToString<bigint>
  transaction?: string
}

export interface PrizeStarsActionData {
  type: 'prize-stars'
  unclaimed?: boolean
  stars: ToString<bigint>
  transaction: string
  boostPeer: ToString<EntityID>
  giveawayMsg: number
}

export interface StarGiftData {
  limited?: boolean
  soldOut?: boolean
  birthday?: boolean
  id: ToString<bigint>
  sticker?: DocumentData
  stars: ToString<bigint>
  availabilityRemains?: number
  availabilityTotal?: number
  convertStars: ToString<bigint>
  firstSaleDate?: number
  lastSaleDate?: number
}

export interface StarGiftActionData {
  type: 'star-gift'
  nameHidden?: boolean
  saved?: boolean
  converted?: boolean
  gift: StarGiftData
  message?: TextWithEntitiesData
  convertStars?: ToString<bigint>
}

export interface UnknownActionData {
  type: 'unknown'
}

export interface RestoredBackup {
  backupCid: string
  dialogData: DialogData
  messages: MessageData[]
  mediaMap: Record<string, Uint8Array>
  participants: Record<string, EntityData>
  hasMoreMessages: boolean
  isLoadingMore?: boolean
  lastBatchIndex: number
  lastMessageIndex: number
}

export type MediaData =
  | PhotoMediaData
  | GeoMediaData
  | ContactMediaData
  | UnsupportedMediaData
  | DocumentMediaData
  | WebPageMediaData
  | VenueMediaData
  | GameMediaData
  | InvoiceMediaData
  | GeoLiveMediaData
  | PollMediaData
  | DiceMediaData
  | StoryMediaData
  | GiveawayMediaData
  | GiveawayResultsMediaData
  | PaidMediaData
  | UnknownMediaData

export interface PhotoMediaData {
  type: 'photo'
  photo?: PhotoData
  spoiler?: boolean
  ttlSeconds?: number
}

export interface GeoPointData {
  lat: number
  long: number
  accessHash: ToString<bigint>
  accuracyRadius?: number
}

export interface GeoMediaData {
  type: 'geo'
  geo: GeoPointData
}

export interface ContactMediaData {
  type: 'contact'
  phoneNumber: string
  firstName: string
  lastName: string
  vcard: string
  user: ToString<EntityID>
}

export interface UnsupportedMediaData {
  type: 'unsupported'
}

export interface DocumentMediaData {
  type: 'document'
  document?: DocumentData // as far as I understood, one is for one document and the other is for an array of documents
  altDocuments?: DocumentData[]
  nopremium?: boolean
  spoiler?: boolean
  video?: boolean
  round?: boolean
  voice?: boolean
  ttlSeconds?: number
}

export type BaseThemeData =
  | BaseThemeClassicData
  | BaseThemeDayData
  | BaseThemeNightData
  | BaseThemeTintedData
  | BaseThemeArcticData
  | UnknownBaseThemeData

export interface BaseThemeClassicData {
  type: 'classic'
}

export interface BaseThemeDayData {
  type: 'day'
}

export interface BaseThemeNightData {
  type: 'night'
}

export interface BaseThemeTintedData {
  type: 'tinted'
}

export interface BaseThemeArcticData {
  type: 'arctic'
}

export interface UnknownBaseThemeData {
  type: 'unknown'
}
export interface ThemeSettingsData {
  messageColorsAnimated?: boolean
  baseTheme: BaseThemeData
  accentColor: number
  outboxAccentColor?: number
  messageColors?: number[]
  wallpaper?: WallPaperData
}

export type WebPageAttributeData =
  | WebPageAttributeThemeData
  | WebPageAttributeStoryData
  | WebPageAttributeStickerSetData
  | UnknownWebPageAttributeData

export interface WebPageAttributeThemeData {
  type: 'theme'
  documents?: DocumentData[]
  settings?: ThemeSettingsData
}

export interface WebPageAttributeStoryData {
  type: 'story'
  id: number
  peer: PeerData
  story?: StoryItemData
}

export interface WebPageAttributeStickerSetData {
  type: 'sticker'
  emojis?: boolean
  textColor?: boolean
  stickers: DocumentData[]
}

export interface UnknownWebPageAttributeData {
  type: 'unknown'
}

export type WebPageData =
  | WebPagePendingData
  | WebPageNotModifiedData
  | DefaultWebPageData
  | UnknownWebPageData

export interface WebPagePendingData {
  type: 'pending'
  id: ToString<bigint>
  date: number
  url?: string
}
export interface WebPageNotModifiedData {
  type: 'not-modified'
  cachedPageViews?: number
}

export type RichTextData =
  | RichTextPlainData
  | RichTextBoldData
  | RichTextItalicData
  | RichTextUnderlineData
  | RichTextStrikeData
  | RichTextFixedData
  | RichTextUrlData
  | RichTextEmailData
  | RichTextConcatData
  | RichTextSubscriptData
  | RichTextSuperscriptData
  | RichTextMarkedData
  | RichTextPhoneData
  | RichTextImageData
  | RichTextAnchorData

export interface RichTextPlainData {
  type: 'plain'
  text: string
}

export interface RichTextBoldData {
  type: 'bold'
  text: RichTextData
}

export interface RichTextItalicData {
  type: 'italic'
  text: RichTextData
}

export interface RichTextUnderlineData {
  type: 'underline'
  text: RichTextData
}

export interface RichTextStrikeData {
  type: 'strike'
  text: RichTextData
}

export interface RichTextFixedData {
  type: 'fixed'
  text: RichTextData
}

export interface RichTextUrlData {
  type: 'url'
  text: RichTextData
  url: string
  webpage: ToString<bigint>
}

export interface RichTextEmailData {
  type: 'email'
  text: RichTextData
  email: string
}

export interface RichTextConcatData {
  type: 'concat'
  texts: RichTextData[]
}

export interface RichTextSubscriptData {
  type: 'subscript'
  text: RichTextData
}

export interface RichTextSuperscriptData {
  type: 'superscript'
  text: RichTextData
}

export interface RichTextMarkedData {
  type: 'marked'
  text: RichTextData
}

export interface RichTextPhoneData {
  type: 'phone'
  text: RichTextData
  phone: string
}

export interface RichTextImageData {
  type: 'image'
  document: ToString<bigint>
  w: number
  h: number
}

export interface RichTextAnchorData {
  type: 'anchor'
  text: RichTextData
  name: string
}

export interface PageCaptionData {
  text: RichTextData
  credit: RichTextData
}

export type PageBlockData =
  | PageBlockUnsupportedData
  | PageBlockTitleData
  | PageBlockSubtitleData
  | PageBlockAuthorDateData
  | PageBlockHeaderData
  | PageBlockSubheaderData
  | PageBlockParagraphData
  | PageBlockPreformattedData
  | PageBlockFooterData
  | PageBlockDividerData
  | PageBlockAnchorData
  | PageBlockListData
  | PageBlockBlockquoteData
  | PageBlockPullquoteData
  | PageBlockPhotoData
  | PageBlockVideoData
  | PageBlockCoverData
  | PageBlockEmbedData
  | PageBlockEmbedPostData
  | PageBlockCollageData
  | PageBlockSlideshowData
  | PageBlockChannelData
  | PageBlockAudioData
  | PageBlockKickerData
  | PageBlockTableData
  | PageBlockOrderedListData
  | PageBlockDetailsData
  | PageBlockRelatedArticlesData
  | PageBlockMapData

export interface PageBlockUnsupportedData {
  type: 'unsupported'
}

export interface PageBlockTitleData {
  type: 'title'
  text: RichTextData
}

export interface PageBlockSubtitleData {
  type: 'subtitle'
  text: RichTextData
}

export interface PageBlockAuthorDateData {
  type: 'author-date'
  author: RichTextData
  publishedDate: number
}

export interface PageBlockHeaderData {
  type: 'header'
  text: RichTextData
}

export interface PageBlockSubheaderData {
  type: 'subheader'
  text: RichTextData
}

export interface PageBlockParagraphData {
  type: 'paragraph'
  text: RichTextData
}

export interface PageBlockPreformattedData {
  type: 'preformatted'
  text: RichTextData
  language: string
}

export interface PageBlockFooterData {
  type: 'footer'
  text: RichTextData
}

export interface PageBlockDividerData {
  type: 'divider'
}

export interface PageBlockAnchorData {
  type: 'anchor'
  name: string
}

export interface PageBlockListData {
  type: 'list'
  items: string[] // NOTE: could improve (Api.TypePageListItem)
}

export interface PageBlockBlockquoteData {
  type: 'blockquote'
  text: RichTextData
  caption: RichTextData
}

export interface PageBlockPullquoteData {
  type: 'pullquote'
  text: RichTextData
  caption: RichTextData
}

export interface PageBlockPhotoData {
  type: 'photo'
  photo: ToString<bigint>
  caption: PageCaptionData
  url?: string
  webpage?: ToString<bigint>
}

export interface PageBlockVideoData {
  type: 'video'
  video: ToString<bigint>
  caption: PageCaptionData
  autoplay?: boolean
  loop?: boolean
}

export interface PageBlockCoverData {
  type: 'cover'
  block: PageBlockData
}

export interface PageBlockEmbedData {
  type: 'embed'
  fullWidth?: boolean
  allowScrolling?: boolean
  url?: string
  html?: string
  posterPhoto?: ToString<bigint>
  caption: PageCaptionData
  w?: number
  h?: number
}

export interface PageBlockEmbedPostData {
  type: 'embed-post'
  url: string
  webpage: ToString<bigint>
  author: string
  authorPhoto: ToString<bigint>
  date: number
  blocks: PageBlockData[]
  caption: PageCaptionData
}

export interface PageBlockCollageData {
  type: 'collage'
  items: PageBlockData[]
  caption: PageCaptionData
}

export interface PageBlockSlideshowData {
  type: 'slideshow'
  items: PageBlockData[]
  caption: PageCaptionData
}

export interface PageBlockChannelData {
  type: 'channel'
  channel: ToString<bigint> // NOTE: could improve (Api.TypeChat)
}

export interface PageBlockAudioData {
  type: 'audio'
  audio: ToString<bigint>
  caption: PageCaptionData
}

export interface PageBlockKickerData {
  type: 'kicker'
  text: RichTextData
}

export interface PageBlockTableData {
  type: 'table'
  bordered?: boolean
  striped?: boolean
  title: RichTextMarkedData
  rows: Array<Array<string>> // NOTE: could improve (Api.TypePageTableRow[)
}

export interface PageBlockOrderedListData {
  type: 'ordered-list'
  items: string[] // NOTE: could improve (Api.TypePageListOrderedItem)
}

export interface PageBlockDetailsData {
  type: 'details'
  open?: boolean
  blocks: PageBlockData[]
  title: RichTextData
}

export interface PageRelatedArticleData {
  url: string
  webpage: ToString<bigint>
  title?: string
  description?: string
  photo?: ToString<bigint>
  author?: string
  publishedDate?: number
}

export interface PageBlockRelatedArticlesData {
  type: 'related-articles'
  title: RichTextMarkedData
  articles: PageRelatedArticleData[]
}

export interface PageBlockMapData {
  type: 'map'
  geo: GeoPointData
  zoom: number
  w: number
  h: number
  caption: PageCaptionData
}

export interface PageData {
  part?: boolean
  rtl?: boolean
  v2?: boolean
  url: string
  blocks: PageBlockData[]
  photos?: PhotoData[]
  documents?: DocumentData[]
  views?: number
}
export interface DefaultWebPageData {
  type: 'default'
  id: ToString<bigint>
  url: string
  displayUrl: string
  hash: number
  hasLargeMedia?: boolean
  tg_type?: string // maps to telegram original 'type' attribute
  siteName?: string
  title?: string
  description?: string
  photo?: PhotoData
  embedUrl?: string
  embedType?: string
  embedWidth?: number
  embedHeight?: number
  duration?: number
  author?: string
  document?: DocumentData
  cachedPage?: PageData
  // attributes?: WebPageAttributeData[]
}

export interface UnknownWebPageData {
  type: 'unknown'
}

export interface WebPageMediaData {
  type: 'webpage'
  forceLargeMedia?: boolean
  forceSmallMedia?: boolean
  manual?: boolean
  safe?: boolean
  webpage?: WebPageData
}

export interface VenueMediaData {
  type: 'venue'
  geo?: GeoPointData
  title: string
  address: string
  provider: string
  venue: string
  venueType: string
}

export interface GameData {
  id: ToString<bigint>
  title: string
  description: string
  shortName: string
  accessHash: ToString<bigint>
  photo: PhotoData
  document?: DocumentData
}

export interface GameMediaData {
  type: 'game'
  game: GameData
}

export type WebDocumentData =
  | DefaultWebDocumentData
  | WebDocumentNoProxyData
  | UnknownWebDocumentData

export interface DefaultWebDocumentData {
  type: 'default'
  url: string
  size: number
  mimeType: string
  attributes: DocumentAttributeData[]
  accessHash?: ToString<bigint>
}

export interface WebDocumentNoProxyData {
  type: 'proxy'
  url: string
  size: number
  mimeType: string
  attributes: DocumentAttributeData[]
}

export interface UnknownWebDocumentData {
  type: 'unknown'
}

export type ExtendedMediaData =
  | ExtendedMediaPreviewData
  | ExtendedMediaDefaultData
  | ExtendedMediaUnknownData

export interface ExtendedMediaDefaultData {
  type: 'default'
  media?: MediaData
}

export interface ExtendedMediaPreviewData {
  type: 'preview'
  w?: number
  h?: number
  thumb?: PhotoSizeData
  videoDuration?: number
}

export interface ExtendedMediaUnknownData {
  type: 'unknown'
}

export interface InvoiceMediaData {
  type: 'invoice'
  title: string
  description: string
  startParam: string
  currency: string
  totalAmount: ToString<bigint>
  test?: boolean
  receiptMsg?: number
  shippingAddressRequested?: boolean
  photo?: WebDocumentData
  extendedMedia?: ExtendedMediaData
}
export interface GeoLiveMediaData {
  type: 'geo-live'
  geo?: GeoPointData
  period: number
  heading?: number
  proximityNotificationRadius?: number
}

export interface PollAnswerData {
  text: TextWithEntitiesData
  option: Uint8Array
}
export interface PoolData {
  id: ToString<bigint>
  question: TextWithEntitiesData
  answers: PollAnswerData[]
  closed?: boolean
  publicVoters?: boolean
  multipleChoice?: boolean
  quiz?: boolean
  closePeriod?: number
  closeDate?: number
}

export interface PollAnswerVotersData {
  chosen?: boolean
  correct?: boolean
  option: Uint8Array
  voters: number
}
export interface PollResultsData {
  min?: boolean
  results?: PollAnswerVotersData[]
  totalVoters?: number
  recentVoters?: PeerData[]
  solution?: string
  solutionEntities?: MessageEntityData[]
}

export interface PollMediaData {
  type: 'poll'
  poll: PoolData
  results: PollResultsData
}

export interface DiceMediaData {
  type: 'dice'
  value: number
  emoticon: string
}

export interface StoryViewsData {
  hasViewers?: boolean
  viewsCount: number
  forwardsCount?: number
  reactionsCount?: number
  recentViewers?: Array<ToString<bigint>>
  // reactions?: Api.TypeReactionCount[]
}

export type StoryItemData =
  | StoryItemDeletedData
  | StoryItemSkippedData
  | StoryItemDefaultData
  | StoryItemUnknownData

export interface StoryItemDeletedData {
  type: 'deleted'
  id: number
}

export interface StoryItemSkippedData {
  type: 'skipped'
  id: number
  date: number
  expireDate: number
  closeFriends?: boolean
}
export interface StoryItemDefaultData {
  type: 'default'
  id: number
  date: number
  expireDate: number
  pinned?: boolean
  public?: boolean
  closeFriends?: boolean
  min?: boolean
  noforwards?: boolean
  edited?: boolean
  contacts?: boolean
  selectedContacts?: boolean
  out?: boolean
  caption?: string
  from?: PeerData
  media?: MediaData
  views?: StoryViewsData
  entities?: MessageEntityData[]
  // fwdFrom?: Api.TypeStoryFwdHeader
  // mediaAreas?: Api.TypeMediaArea[]
  // privacy?: Api.TypePrivacyRule[]
  // sentReaction?: Api.TypeReaction
}

export interface StoryItemUnknownData {
  type: 'unknown'
}

export interface StoryMediaData {
  type: 'story'
  id: number
  peer: PeerData
  viaMention?: boolean
  story?: StoryItemData
}

export interface GiveawayMediaData {
  type: 'giveaway'
  onlyNewSubscribers?: boolean
  winnersAreVisible?: boolean
  channels: ToString<bigint>[]
  countriesIso2?: string[]
  prizeDescription?: string
  quantity: number
  months?: number
  stars?: ToString<bigint>
  untilDate: number
}

export interface GiveawayResultsMediaData {
  type: 'giveaway-results'
  channel: ToString<bigint>
  launchMsg: number
  winnersCount: number
  unclaimedCount: number
  winners: ToString<bigint>[]
  untilDate: number
  onlyNewSubscribers?: boolean
  refunded?: boolean
  additionalPeersCount?: number
  months?: number
  stars?: ToString<bigint>
  prizeDescription?: string
}

export interface PaidMediaData {
  type: 'paid-media'
  starsAmount: ToString<bigint>
  extendedMedia: ExtendedMediaData[]
}

export interface UnknownMediaData {
  type: 'unknown'
}

export interface LeaderboardUser {
  id: string
  initials: string
  thumbSrc: string
  name: string
  points: number
  isMe: boolean
}

export interface Podium {
  firstPlace: LeaderboardUser | undefined
  secondPlace: LeaderboardUser | undefined
  thirdPlace: LeaderboardUser | undefined
}

export interface Ranking {
  rank: number
  percentile: number
  points: number
}
