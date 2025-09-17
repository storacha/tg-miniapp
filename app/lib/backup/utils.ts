import bigInt from 'big-integer'
import { Entity } from '@/vendor/telegram/define'
import { EntityID, EntityType, ToString } from '@/api'
import { Api } from '@/vendor/telegram'
import { decodeStrippedThumb, toJPGDataURL } from '../utils'

export const isDownloadableMedia = (media: Api.TypeMessageMedia): boolean => {
  return (
    media.className === 'MessageMediaPhoto' ||
    media.className === 'MessageMediaDocument' // this can represent a video, audio or other document types
  )
}

export const getEntityType = (entity: Entity): EntityType => {
  switch (entity.className) {
    case 'User':
      return 'user'
    case 'Chat':
      return 'chat'
    case 'Channel':
      return 'channel'
    default:
      return 'unknown'
  }
}

/**
 * Normalizes an entity ID based on its type by removing specific prefixes.
 *
 * This function adjusts the ID format depending on the type of entity (e.g., user, channel, chat).
 * It ensures that the ID is in a consistent format for further processing.
 *
 * @param id - The entity ID to normalize. It must be convertible to a string.
 * @param type - The type of the entity. Can be one of the following:
 *   - `'user'`: Returns the ID as-is.
 *   - `'channel'`: Removes the `-100` prefix from the ID.
 *   - `'chat'`: Removes the `-` character from the ID.
 *   - Any other type: Removes both `-100` and `-` from the ID.
 *
 * @returns The normalized entity ID as a string.
 *
 * @remarks
 * - The behavior for the default case relies on Telegram's known ID prefixing conventions.
 *   However, it is recommended to explicitly handle all dialog types to avoid unexpected results.
 * - This can be used to convert `dialog.id` to `dialog.entity.id`
 *
 */
export const getNormalizedEntityId = (
  id: ToString<EntityID>,
  type: EntityType
): ToString<EntityID> => {
  switch (type) {
    case 'user':
      return id
    case 'channel':
      return id.replace(/-100/, '')
    case 'chat':
      return id.replace(/-/, '')
    default:
      return id.replace(/-100|-/, '')
  }
}

export const getThumbSrc = (strippedThumbBytes?: Uint8Array) => {
  let thumbSrc = ''
  if (strippedThumbBytes) {
    thumbSrc = toJPGDataURL(decodeStrippedThumb(strippedThumbBytes))
  }
  return thumbSrc
}

export const buildDialogInputPeer = ({
  id,
  accessHash,
  type,
}: {
  id: string
  accessHash?: string
  type: EntityType
}) => {
  const bigId = bigInt(id)
  const bigHash = accessHash ? bigInt(accessHash) : bigInt(0)

  if (type === 'user') {
    return new Api.InputPeerUser({ userId: bigId, accessHash: bigHash })
  } else if (type === 'channel') {
    return new Api.InputPeerChannel({ channelId: bigId, accessHash: bigHash })
  } else if (type === 'chat') {
    return new Api.InputPeerChat({ chatId: bigId })
  }

  return undefined
}

/**
 * Determines the entity type based on the ID format pattern
 */
export const getEntityTypeFromId = (id: string): EntityType => {
  if (id.startsWith('-100')) {
    return 'channel'
  } else if (id.startsWith('-')) {
    return 'chat'
  } else {
    return 'user'
  }
}
