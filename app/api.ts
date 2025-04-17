import { ByteView, Link, SpaceDID, ToString, UnknownLink, Variant } from '@storacha/ui-react'

export type AbsolutePeriod = [from: number, to: number]

/**
 * A period is either a specific to and from time or just a from time with
 * implicit to - now. Values are expressed as seconds since unix epoch.
 */
export type Period = AbsolutePeriod | [from: number]

export type JobID = string

/** A pending backup job. */
export interface Job {
  id: JobID
  /** Run state of the backup. */
  state: 'queued' | 'running' | 'failed'
  /** Indication of completion progress - a number between 0 and 1. */
  progress: number
  /** Error message in case of failed state. */
  error?: string
  /** The space the data is being saved to. */
  space: SpaceDID
  /** The dialogs that were backed up. */
  dialogs: Set<bigint>
  /** Time period this backup covers. */
  period: AbsolutePeriod
}

/** A completed backup. */
export interface Backup {
  /** Link to the actual backup data. */
  data: UnknownLink
  /** The dialogs that were backed up. */
  dialogs: Set<bigint>
  /** Time period this backup covers. */
  period: AbsolutePeriod
  /** Timestamp of when this backup was taken. */
  created: number
}

export interface Page<T> {
  items: T[]
}

export interface JobStorage extends EventTarget {
  find: (id: JobID) => Promise<Job|null>
  list: () => Promise<Page<Job>>
  add: (job: Job) => Promise<void>
  update: (id: JobID, data: Partial<Omit<Job, 'id'>>) => Promise<void>
  remove: (id: JobID) => Promise<void>
}

export interface BackupStorage extends EventTarget {
  list: () => Promise<Page<Backup>>
  add: (backup: Backup) => Promise<void>
}

export interface JobManager {
  /** Add a backup job to the queue. */
  add: (space: SpaceDID, dialogs: Set<bigint>, period: Period) => Promise<JobID>
  /** 
   * Remove an existing job. If the job is queued it will be cancelled. Jobs
   * that are running cannot be removed and will throw an error.
   */
  remove: (id: JobID) => Promise<void>
}

export type BackupModel = Variant<{
  'tg-miniapp-backup@0.0.1': BackupData
}>

/** A Telegram entity ID. */
export type EntityID = bigint
export type PhotoID = bigint
export type MessageID = number

export type EncryptedByteView<T> = ByteView<T>

export interface BackupData {
  /** The dialogs available in this backup. */
  dialogs: Record<ToString<EntityID>, Link<EncryptedByteView<DialogData>>>
  /** The period this backup covers. */
  period: AbsolutePeriod
}

export interface DialogData extends EntityData {
  /** A link to the entities that participated in this dialog. */
  entities: Link<EncryptedByteView<EntityRecordData>>
  /**
   * An array of links to lists of ordered messages sent by entities
   * participating in this dialog.
   *
   * Messages are ordered newest to oldest.
   *
   * Each list has a maximum of 1,000 messages.
   */
  messages: Array<Link<EncryptedByteView<Array<MessageData|ServiceMessageData>>>>
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

export interface MessageData {
  id: MessageID
  type: 'message'
  /**
   * ID of the peer who sent this message. It will be undefined for anonymous
   * messages.
   */
  from?: ToString<EntityID>
  /** Timestamp in seconds since Unix epoch that this message was sent. */
  date: number
  /** The string text of the message. */
  message: string
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
  title: string;
  users: ToString<EntityID>[];
}

export interface ChatEditTitleActionData {
  type: 'chat-edit-title'
  title: string
}

/** @see https://core.telegram.org/api/files#image-thumbnail-types */
export type ThumbType = 's'|'m'|'x'|'y'|'w'|'a'|'b'|'c'|'d'|'i'|'j'

export interface PhotoSizeData {
  type: 'photo-size'
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
  type: 'cached-photo-size'
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
  type: 'stripped-photo-size'
  /**
   * Indicator for resolution and image transform that was applied server-side.
   * @see https://core.telegram.org/api/files#image-thumbnail-types
   */
  thumbType: ThumbType
  w: number
  h: number
  /**
   * A low-resolution compressed JPG payload.
   * @see https://core.telegram.org/api/files#stripped-thumbnails
   */
  bytes: Uint8Array
}

export interface ProgressivePhotoSizeData {
  type: 'progressive-photo-size'
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
  type: 'path-photo-size'
  /**
   * Compressed SVG path payload.
   * @see https://core.telegram.org/api/files#vector-thumbnails
   */
  bytes: Uint8Array
}

/** @see https://core.telegram.org/api/files#video-types */
export type VideoType = 'u'|'v'|'f'

export interface VideoSizeData {
  type: 'video-size'
  videoType: VideoType
  w: number
  h: number
  size: number
  /** Timestamp that should be shown as static preview to the user (seconds). */
  videoStartTs: number
}

export type RGB24Color =
  | [number]
  | [number,number]
  | [number,number,number]
  | [number,number,number,number]

export interface EmojiMarkupVideoSizeData {
  type: 'emoji-markup-video-size'
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
  stickerset: StickerSetData
  sticker: ToString<bigint>
  /**
   * 1, 2, 3 or 4 RBG-24 colors used to generate a solid (1), gradient (2) or
   * freeform gradient (3, 4) background, similar to how fill wallpapers are
   * generated. The rotation angle for gradient backgrounds is 0.
   */
  backgroundColors: RGB24Color
}

export interface PhotoData {
  id: ToString<PhotoID>
  hasStickers?: boolean
  accessHash: ToString<bigint>
  fileReference: Uint8Array
  date: number
  sizes: Array<PhotoSizeData|CachedPhotoSizeData|StrippedPhotoSizeData|ProgressivePhotoSizeData|PathPhotoSizeData>
  videoSizes?: Array<VideoSizeData|EmojiMarkupVideoSizeData|StickerMarkupVideoSizeData>
}

export interface ChatEditPhotoActionData {
  type: 'chat-edit-photo'
  photo: PhotoData
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

export interface BotAppNotModifiedData {
  type: 'bot-app-not-modified'
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
  stickerset: StickerSetData
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
  stickerset: StickerSetData
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
  mimeType: string;
  size: ToString<bigint>
  thumbs?: PhotoSizeData[]
  videoThumbs?: VideoSizeData[]
  dcId: ToString<bigint>
  attributes: DocumentAttributeData[]
}

export interface BotAppData {
  type: 'bot-app'
  id: ToString<bigint>
  accessHash: ToString<bigint>
  shortName: string
  title: string
  description: string
  photo?: PhotoData
  document?: DocumentData
  hash: ToString<bigint>
}

export interface BotAllowedActionData {
  type: 'bot-allowed'
  attachMenu?: boolean
  fromRequest?: boolean
  domain?: string
  app?: BotAppNotModifiedData | BotAppData
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
  dcId: number
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
  types: SecureValueData[]
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
  currency: string;
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
  iconEmoji: ToString<bigint>
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
  photo: PhotoData
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
  document: DocumentData
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
  user: ToString<EntityID>
  firstName?: string
  lastName?: string
  username?: string
  photo?: PhotoData
}

export interface ChatRequestedPeerData {
  type: 'chat'
  chat: ToString<EntityID>
  title?: string
  photo?: PhotoData
}

export interface ChannelRequestedPeerData {
  type: 'channel'
  channel: ToString<EntityID>
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
  sticker: DocumentData
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
