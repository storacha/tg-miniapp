# Telegram backup model schema

Example:

```ts
// bafy...backup
{
  "tg-miniapp-backup@0.0.1": {
    // mapping of dialog ID to dialog backup data
    dialogs: {
      dialogID: { '/': 'bafy...dialog' }
    },
    // absolute time period (start, end) in seconds since unix epoch
    period: [0, Date.now() / 1000]
  }
}

// bafy...dialog
{
  id: 'string bigint',
  type: 'entity-type (user, chat, channel, unknown)',
  name: 'chat name',
  photo?: {
    id: 'string bigint',
    strippedThumb?: new Uint8Array()
  },
  // entities are the participants in the dialog - a mapping of entity
  // ID to entity backup data
  entities: { '/': 'bafy...entities' },
  // messages in the dialog (paginated from newest to oldest)
  messages: [
    // up to 1,000 messages
    { '/': bafy...messages },
    // older messages
    { '/': bafy...olderMessages }
  ]
}

// bafy...entities
{
  entityID: {
    id: 'string bigint'
    type: 'entity-type (user, chat, channel, unknown)',
    name: 'user name',
    photo?: {
      id: 'string bigint',
      strippedThumb?: new Uint8Array()
    }
  },
  anotherEntityID: { /* ... */ }
}

// bafy...messages
[
  {
    id: 12345,
    from: 'entity ID', // find in `entities`
    date: 98765,
    message: 'Hello World!'
  },
  // more messages
]
```

## Versioning

The root block contains a version tag (e.g. `tg-miniapp-backup@0.0.1`) to allow conditional rendering based on expected schema for a given version.

## Encoding and Encryption

All blocks that are not media items are `dag-cbor` encoded and _encrypted_. The resulting bytes are encoded as IPFS UnixFS files (`dag-pb` encoded) to take advantage of chunking, and easy access from IPFS Gateways.

e.g.

```js
unixfs(encrypt(dagCBOR(data)))
```

Data is encoded using AES-CBC with the following configuration:

```js
{
  algorithm: 'AES-CBC',
  iterations: 10000, // PBKDF2 iterations
  keyLength: 32, // AES-256 key length in bytes
  ivLength: 16, // AES IV length
  saltLength: 16, // Salt length
}
```

## Sharding

Backup data is sharded to allow quick retrieval of a subset of the backup without having to download and decrypt the entirety of the backup.

### Root

The root block is a simple structure that defines the _period_ the backup pertains to and a list of dialogs that have been backed up during this period. Dialogs are 1-on-1 chats, group chats or channels.

### Dialogs

Fetching an encrypted dialog allows a UI to display details of the dialog, like the title, it's avatar etc. while messages and entities are loaded asynchronously.

#### Entities

Within a dialog the same entity (typically a user) may post several messages, so this information is not inlined with messages but instead referenced from messages by ID (`from` or `peer` property).

The encrypted entities data contains all entities that participated in the dialog for the duration of the backup.

#### Messages

Messages are ordered from newest to oldest and are sharded in batches of up to 1,000. This allows messages to be paginated, to avoid excessive memory usage and long load times.

## Considerations

### Telegram IDs

IDs in Telegram are typically 64 bit integers, represented in the JavaScript libraries as `bigint`s. The JS IPLD stack currently does not support `bigint` so Telegram IDs are encoded as strings instead.

## Typescript Reference

This is a subset of the important model types as defined in [`app/api.ts`](../app/api.ts) for the schema version at time of writing `tg-miniapp-backup@0.0.1`:

```ts
import { ByteView, Link, ToString, UnknownLink, Variant } from '@storacha/ui-react'

type BackupModel = Variant<{
  'tg-miniapp-backup@0.0.1': BackupData
}>

interface BackupData {
  /** The dialogs available in this backup. */
  dialogs: Record<ToString<EntityID>, Link<EncryptedByteView<DialogData>>>
  /** The period this backup covers. */
  period: AbsolutePeriod
}

type AbsolutePeriod = [from: number, to: number]

/** A Telegram entity ID. */
type EntityID = bigint
type PhotoID = bigint
type MessageID = number

type EncryptedByteView<T> = ByteView<T>

interface DialogData extends EntityData {
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

type EntityRecordData = Record<ToString<EntityID>, EntityData>

type EntityType = 'user' | 'chat' | 'channel' | 'unknown'

interface EntityData {
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

interface MessageData {
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

interface ServiceMessageData {
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
```
