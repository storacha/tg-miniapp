import { ByteView, Link, Phantom, SpaceDID, ToString, UnknownLink, Variant } from '@storacha/ui-react'

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
  /** Restart an existing job. */
  restart: (id: JobID) => Promise<void>
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

export interface DialogData {
  /** The entities that participated in this dialog. */
  entities: Record<ToString<EntityID>, EntityData>
  /** Ordered messages sent by entities participating in this dialog. */
  messages: MessageData[]
}

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
  /** ID of the peer who sent this message. */
  from: ToString<EntityID>
  /** Timestamp in seconds since Unix epoch that this message was sent. */
  date: number
  /** The string text of the message. */
  message: string
}
