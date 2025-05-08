import * as Crypto from '@/lib/crypto'
import * as dagCBOR from '@ipld/dag-cbor'
import * as raw from 'multiformats/codecs/raw'
import { BackupModel, Decrypter, DialogData, EntityData, MessageData, RestoredBackup } from '@/api'

const gatewayURL = process.env.NEXT_PUBLIC_STORACHA_GATEWAY_URL || 'https://w3s.link'

export const getFromStoracha = async (cid: string) => {
	const url = new URL(`/ipfs/${cid}`, gatewayURL)
	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`Failed to fetch: ${response.status} ${response.statusText} ${url}`);
	}
	return response
}

export const restoreBackup = async (
  backupCid: string,
  dialogId: string,
  cipher: Decrypter,
  limit: number = 50
): Promise<RestoredBackup> => {
  const response = await getFromStoracha(backupCid)
  const encryptedBackupRaw = new Uint8Array(await response.arrayBuffer())
  const decryptedBackupRaw = await Crypto.decryptAndDecode(cipher, dagCBOR, encryptedBackupRaw) as BackupModel

  const dialogCid = decryptedBackupRaw['tg-miniapp-backup@0.0.1'].dialogs[dialogId].toString()
  const dialogResult = await getFromStoracha(dialogCid)
  const encryptedDialogData = new Uint8Array(await dialogResult.arrayBuffer())

  const decryptedDialogData = await Crypto.decryptAndDecode(cipher, dagCBOR, encryptedDialogData) as DialogData

  const messagesToFetch = decryptedDialogData.messages.slice(0, limit)
  const hasMoreMessages = decryptedDialogData.messages.length > limit

  const mediaMap: Record<string, Uint8Array> = {}

  const [restoredMessages, restoredEntities] = await Promise.all([
    // Fetch and decrypt messages
    (async () => {
      const messages: MessageData[] = []
      for (const messageLink of messagesToFetch) {
        const messagesResult = await getFromStoracha(messageLink.toString())
        const encryptedMessageData = new Uint8Array(await messagesResult.arrayBuffer())
        const decryptedMessageData = await Crypto.decryptAndDecode(cipher, dagCBOR, encryptedMessageData) as MessageData[]
        
        for (const message of decryptedMessageData) {
          if (message.media?.content) {
            const mediaCid = message.media.content.toString()
            if (!mediaMap[mediaCid]) {
              const mediaResult = await getFromStoracha(mediaCid)
              const encryptedRawMedia = new Uint8Array(await mediaResult.arrayBuffer())
              const rawMedia = await Crypto.decryptAndDecode(cipher, raw, encryptedRawMedia)
              mediaMap[mediaCid] = rawMedia
            }
          }
          messages.push(message)
        }
      }
      return messages
    })(),

    // Fetch and decrypt entities
    (async () => {
      const entitiesResult = await getFromStoracha(decryptedDialogData.entities.toString())
      const encryptedEntitiesData = new Uint8Array(await entitiesResult.arrayBuffer())
      return await Crypto.decryptAndDecode(cipher, dagCBOR, encryptedEntitiesData) as Record<string, EntityData>
    })(),
  ])

  return {
    dialogData: decryptedDialogData,
    messages: restoredMessages,
    participants: restoredEntities,
    mediaMap,
    hasMoreMessages
  }
}


export const fetchMoreMessages = async (dialogData: DialogData, cipher: Decrypter, offset: number, limit: number) => {
    const newMessages: MessageData[] = []
    const messagesToFetch = dialogData.messages.slice(offset, offset + limit)
    
    for (const messageLink of messagesToFetch) {
      const messagesResult = await getFromStoracha(messageLink.toString())
      const encryptedMessageData = new Uint8Array(await messagesResult.arrayBuffer())
      const decryptedMessageData = await Crypto.decryptAndDecode(cipher, dagCBOR, encryptedMessageData) as MessageData[]
      newMessages.push(...decryptedMessageData)
    }
    
    return newMessages
}