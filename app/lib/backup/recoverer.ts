import * as Crypto from '@/lib/crypto'
import * as dagCBOR from '@ipld/dag-cbor'
import * as raw from 'multiformats/codecs/raw'
import pMap from 'p-map'
import {
  BackupModel,
  Decrypter,
  DialogData,
  DialogDataMessages,
  EntityData,
  MessageData,
  RestoredBackup,
} from '@/api'

const gatewayURL =
  process.env.NEXT_PUBLIC_STORACHA_GATEWAY_URL || 'https://w3s.link'

// const sleep = (ms: number, signal?: AbortSignal) =>
//   new Promise<void>((resolve, reject) => {
//     const id = setTimeout(() => {
//       if (signal) signal.removeEventListener('abort', onAbort)
//       resolve()
//     }, ms)
//     const onAbort = () => {
//       clearTimeout(id)
//       reject(new DOMException('Aborted', 'AbortError'))
//     }
//     if (signal) {
//       if (signal.aborted) onAbort()
//       else signal.addEventListener('abort', onAbort, { once: true })
//     }
//   })

///// WITH HEAD POLLING:

// export const getFromStoracha = async (
//   cid: string,
// {
//     maxTimeoutMs = 120_000, // 2 minutes
//     initialDelayMs = 500,
//     maxDelayMs = 5000,
//     signal,
//   }: {
//     maxTimeoutMs?: number
//     initialDelayMs?: number
//     maxDelayMs?: number
//     signal?: AbortSignal
//   } = {}
// ): Promise<Response> => {
//   const url = new URL(`/ipfs/${cid}`, gatewayURL)
//   let delay = initialDelayMs
// const startTime = Date.now()

//  while (Date.now() - startTime < maxTimeoutMs) {
//     const headResponse = await fetch(url, {
//       method: 'HEAD',
//       redirect: 'manual' ,
//       cache: 'no-store',
//       signal,
//     })

//     const is3xx = headResponse.status >= 300 && headResponse.status < 400
//     const isOpaqueRedirect = headResponse.type === 'opaqueredirect'

//     if (headResponse.ok) {
//       const response = await fetch(url, { redirect: 'manual' })
//       if (response.ok) return response

//       // If GET fails but HEAD succeeded, treat as temporary issue and continue polling
//     }

//     if (is3xx || isOpaqueRedirect) {
//       const remainingTime = maxTimeoutMs - (Date.now() - startTime)

//       if (remainingTime <= 0) {
//         throw new Error(
//           `Timeout after ${maxTimeoutMs}ms waiting for resource: ${url}`
//         )
//       }

//       const jitter = Math.random() * 100
//       const waitMs = Math.min(delay + jitter, maxDelayMs, remainingTime)
//       await sleep(waitMs, signal)

//       delay = Math.min(delay * 2, maxDelayMs)
//       continue
//     }

//     // For non-retriable errors, throw immediately
//     throw new Error(
//       `Failed to fetch: ${headResponse.status} ${headResponse.statusText} ${url}`
//     )
//   }

//   throw new Error(`Timeout after ${maxTimeoutMs}ms: ${url}`)
// }

////// WITH RETRIES:

// export const getFromStoracha = async (
//   cid: string,
//   {
//     maxTimeoutMs = 120000, // 2 minutes default timeout
//     initialDelayMs = 500,
//     maxDelayMs = 5000,
//     signal
//   } : {
//     maxTimeoutMs?: number
//     initialDelayMs?: number
//     maxDelayMs?: number
//     signal?: AbortSignal
//   } = {}
// ): Promise<Response> => {
//   let delay = initialDelayMs
//   const url = new URL(`/ipfs/${cid}`, gatewayURL)
//   const startTime = Date.now()

//   while (Date.now() - startTime < maxTimeoutMs) {
//     const response = await fetch(url, { redirect: 'manual' , signal})

//     if (response.ok) return response

//     const is3xx = response.status >= 300 && response.status < 400
//     const isOpaqueRedirect = response.type === 'opaqueredirect' // browsers in manual redirect mode

//     if (is3xx || isOpaqueRedirect) {
//       const remainingTime = maxTimeoutMs - (Date.now() - startTime)

//       if (remainingTime <= 0) {
//         throw new Error(
//           `Timeout after ${maxTimeoutMs}ms waiting for resource: ${url}`
//         )
//       }

//       const jitter = Math.random() * 100
//       const waitMs = Math.min(delay + jitter, maxDelayMs, remainingTime)
//       await sleep(waitMs, signal)

//       delay = Math.min(delay * 2, maxDelayMs)
//       continue
//     }

//     throw new Error(
//       `Failed to fetch: ${response.status} ${response.statusText} ${url}`
//     )
//   }

//   throw new Error(`Timeout after ${maxTimeoutMs}ms: ${url}`)
// }

export const getFromStoracha = async (cid: string) => {
  const url = new URL(`/ipfs/${cid}`, gatewayURL)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch: ${response.status} ${response.statusText} ${url}`
    )
  }
  return response
}

export const restoreBackup = async (
  backupCid: string,
  dialogId: string,
  cipher: Decrypter,
  limit: number = 20,
  onMediaLoaded: (mediaCid: string, data: Uint8Array) => void
): Promise<RestoredBackup> => {
  const response = await getFromStoracha(backupCid)
  const encryptedBackupRaw = new Uint8Array(await response.arrayBuffer())
  const decryptedBackupRaw = (await Crypto.decryptAndDecode(
    cipher,
    dagCBOR,
    encryptedBackupRaw
  )) as BackupModel

  const dialogCid =
    decryptedBackupRaw['tg-miniapp-backup@0.0.1'].dialogs[dialogId].toString()
  const dialogResult = await getFromStoracha(dialogCid)
  const encryptedDialogData = new Uint8Array(await dialogResult.arrayBuffer())

  const decryptedDialogData = (await Crypto.decryptAndDecode(
    cipher,
    dagCBOR,
    encryptedDialogData
  )) as DialogData

  // Load entities first (needed for all messages)
  const entitiesResult = await getFromStoracha(
    decryptedDialogData.entities.toString()
  )
  const encryptedEntitiesData = new Uint8Array(
    await entitiesResult.arrayBuffer()
  )
  const restoredEntities = (await Crypto.decryptAndDecode(
    cipher,
    dagCBOR,
    encryptedEntitiesData
  )) as Record<string, EntityData>

  // Load initial messages progressively
  const mediaMap: Record<string, Uint8Array> = {}
  const {
    messages: initialMessages,
    lastBatchIndex,
    lastMessageIndex,
    hasMoreMessages,
  } = await loadMessagesProgressively(
    decryptedDialogData.messages,
    cipher,
    mediaMap,
    0,
    0,
    limit,
    onMediaLoaded
  )

  return {
    backupCid,
    dialogData: decryptedDialogData,
    messages: initialMessages,
    participants: restoredEntities,
    mediaMap,
    hasMoreMessages,
    lastBatchIndex,
    lastMessageIndex,
  }
}

interface LoadResult {
  messages: MessageData[]
  lastBatchIndex: number
  lastMessageIndex: number
  hasMoreMessages: boolean
}

const loadMessagesProgressively = async (
  messageBatches: DialogDataMessages,
  cipher: Decrypter,
  mediaMap: Record<string, Uint8Array>,
  startBatchIndex: number,
  startMessageIndex: number,
  limit: number,
  onMediaLoaded: (mediaCid: string, data: Uint8Array) => void
): Promise<LoadResult> => {
  const messages: MessageData[] = []
  let currentBatchIndex = startBatchIndex
  let currentMessageIndex = startMessageIndex
  let loadedCount = 0

  // Load all messages (text) immediately
  while (currentBatchIndex < messageBatches.length && loadedCount < limit) {
    const messageLink = messageBatches[currentBatchIndex]
    const messagesResult = await getFromStoracha(messageLink.toString())
    const encryptedMessageData = new Uint8Array(
      await messagesResult.arrayBuffer()
    )
    const decryptedMessageData = (await Crypto.decryptAndDecode(
      cipher,
      dagCBOR,
      encryptedMessageData
    )) as MessageData[]

    const remainingInBatch = decryptedMessageData.length - currentMessageIndex
    const toLoadFromBatch = Math.min(remainingInBatch, limit - loadedCount)

    const batchMessages = decryptedMessageData.slice(
      currentMessageIndex,
      currentMessageIndex + toLoadFromBatch
    )

    messages.push(...batchMessages)
    loadedCount += batchMessages.length
    currentMessageIndex += toLoadFromBatch

    if (currentMessageIndex >= decryptedMessageData.length) {
      currentBatchIndex++
      currentMessageIndex = 0
    }
  }

  const loadMediaInBackground = async () => {
    const mediaCidsToLoad = messages
      .map((message) => message.media?.content?.toString())
      .filter((cid): cid is string => !!cid && !mediaMap[cid])

    if (mediaCidsToLoad.length === 0) return

    await pMap(
      mediaCidsToLoad,
      async (mediaCid) => {
        try {
          const mediaResult = await getFromStoracha(mediaCid)
          const encryptedRawMedia = new Uint8Array(
            await mediaResult.arrayBuffer()
          )
          const rawMedia = await Crypto.decryptAndDecode(
            cipher,
            raw,
            encryptedRawMedia
          )
          onMediaLoaded(mediaCid, rawMedia)
        } catch (error) {
          console.warn(`Failed to load media ${mediaCid}:`, error)
        }
      },
      { concurrency: 6 }
    )
  }

  // Start media loading in background - don't await this
  loadMediaInBackground().catch((error) => {
    console.warn('Background media loading failed:', error)
  })

  const hasMoreMessages =
    currentBatchIndex < messageBatches.length ||
    (currentBatchIndex === messageBatches.length - 1 && currentMessageIndex > 0)

  return {
    messages,
    lastBatchIndex: currentBatchIndex,
    lastMessageIndex: currentMessageIndex,
    hasMoreMessages,
  }
}

export const fetchMoreMessages = async (
  dialogDataMessages: DialogDataMessages,
  cipher: Decrypter,
  startBatchIndex: number,
  startMessageIndex: number,
  limit: number,
  onMediaLoaded: (mediaCid: string, data: Uint8Array) => void
) => {
  const mediaMap: Record<string, Uint8Array> = {}
  const result = await loadMessagesProgressively(
    dialogDataMessages,
    cipher,
    mediaMap,
    startBatchIndex,
    startMessageIndex,
    limit,
    onMediaLoaded
  )

  return {
    messages: result.messages,
    mediaMap,
    lastBatchIndex: result.lastBatchIndex,
    lastMessageIndex: result.lastMessageIndex,
    hasMoreMessages: result.hasMoreMessages,
  }
}
