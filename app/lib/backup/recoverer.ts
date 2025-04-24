import * as dagCBOR from '@ipld/dag-cbor'
import * as Crypto from '@/lib/crypto'
import { BackupModel, DialogData, EntityData, MessageData, RestoredBackup } from '@/api'

const gatewayURL = process.env.NEXT_PUBLIC_STORACHA_GATEWAY_URL || 'https://w3s.link'

export const getFromStoracha = async (cid: string) => {
	const url = new URL(`/ipfs/${cid}`, gatewayURL)
	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`Failed to fetch: ${response.status} ${response.statusText} ${url}`);
	}
	return response
}

export const dercyptAndDecode = async (encryptedData: Uint8Array, encryptionPassword: string ) => {
	return dagCBOR.decode(
        await Crypto.decryptContent(encryptedData, encryptionPassword)
    )
}

export const restoreBackup = async (
  backupCid: string,
  dialogId: string,
  encryptionPassword: string,
  limit: number = 50
): Promise<RestoredBackup> => {
  const response = await getFromStoracha(`${backupCid}?format=raw`)
  const backupRaw = dagCBOR.decode(new Uint8Array(await response.arrayBuffer())) as BackupModel

  const dialogCid = backupRaw['tg-miniapp-backup@0.0.1'].dialogs[dialogId].toString()
  const dialogResult = await getFromStoracha(dialogCid)
  const encryptedDialogData = new Uint8Array(await dialogResult.arrayBuffer())

  const decryptedDialogData = dagCBOR.decode(
    await Crypto.decryptContent(encryptedDialogData, encryptionPassword)
  ) as DialogData

  const messagesToFetch = decryptedDialogData.messages.slice(0, limit)
  const hasMoreMessages = decryptedDialogData.messages.length > limit

  const [restoredMessages, restoredEntities] = await Promise.all([
    // Fetch and decrypt messages
    (async () => {
      const messages: MessageData[] = []
      for (const messageLink of messagesToFetch) {
        const messagesResult = await getFromStoracha(messageLink.toString())
        const encryptedMessageData = new Uint8Array(await messagesResult.arrayBuffer())
        const decryptedMessageData = await dercyptAndDecode(encryptedMessageData, encryptionPassword) as MessageData[]
        messages.push(...decryptedMessageData)
      }
      return messages
    })(),

    // Fetch and decrypt entities
    (async () => {
      const entitiesResult = await getFromStoracha(decryptedDialogData.entities.toString())
      const encryptedEntitiesData = new Uint8Array(await entitiesResult.arrayBuffer())
      return await dercyptAndDecode(encryptedEntitiesData, encryptionPassword) as Record<string, EntityData>
    })(),
  ])

  return {
    dialogData: decryptedDialogData,
    messages: restoredMessages,
    participants: restoredEntities,
    hasMoreMessages
  }
}


export const fetchMoreMessages = async (dialogData: DialogData,  encryptionPassword: string, offset: number, limit: number) => {
    const newMessages: MessageData[] = []
    const messagesToFetch = dialogData.messages.slice(offset, offset + limit)
    
    for (const messageLink of messagesToFetch) {
      const messagesResult = await getFromStoracha(messageLink.toString())
      const encryptedMessageData = new Uint8Array(await messagesResult.arrayBuffer())
      const decryptedMessageData = await dercyptAndDecode(encryptedMessageData, encryptionPassword) as MessageData[]
      newMessages.push(...decryptedMessageData)
    }
    
    return newMessages
}