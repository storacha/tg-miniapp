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
import Bottleneck from 'bottleneck'
import * as Sentry from '@sentry/nextjs'

const gatewayURL =
  process.env.NEXT_PUBLIC_STORACHA_GATEWAY_URL || 'https://w3s.link'

const limiter = new Bottleneck({
  minTime: 10, // 10 ms per request will give us 100 requests per minute
  retryDelayOptions: {
    base: 1000, // Start with 1 second delay
    max: 30000, // Max 30 seconds delay
    multiplier: 2, // Exponential backoff
    jitter: true, // Add randomness to prevent thundering herd
  },
})

limiter.on('failed', async (error, jobInfo) => {
  const errorMessage = error.message.toLowerCase()
  const shouldRetry =
    errorMessage.includes('too many requests') ||
    errorMessage.includes('failed to fetch') ||
    error.name === 'TypeError' // Network-level failures

  if (shouldRetry && jobInfo.retryCount < 5) {
    console.warn(
      `Request failed, retrying (${jobInfo.retryCount + 1}/5):`,
      error.message
    )
    return 1000 * Math.pow(2, jobInfo.retryCount) // Exponential backoff
  }

  return null // Don't retry
})

limiter.on('retry', (error, jobInfo) =>
  console.log(`Now retrying ${jobInfo.options.id}`)
)

export const getFromStoracha = async (cid: string) => {
  return await limiter.schedule(async () => {
    const url = new URL(`/ipfs/${cid}`, gatewayURL)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch: ${response.status} ${response.statusText} ${url}`
      )
    }
    return response
  })
}

export const restoreBackup = async (
  backupCid: string,
  dialogId: string,
  cipher: Decrypter,
  limit: number = 20,
  onMediaLoaded: (mediaCid: string, data: Uint8Array) => void
): Promise<RestoredBackup> => {
  return await Sentry.startSpan(
    { op: 'backup.restore', name: 'Restore Backup' },
    async (span) => {
      span.setAttributes({ backupCid, dialogId })

      // Step 1: Fetch backup root
      Sentry.addBreadcrumb({
        category: 'backup.restore',
        message: 'Fetching backup root',
        data: { backupCid },
      })

      const response = await getFromStoracha(backupCid)
      const backupRoot = new Uint8Array(await response.arrayBuffer())

      // Step 2: Decrypt backup root
      const decryptedBackupRaw = await Sentry.startSpan(
        { op: 'backup.decrypt', name: 'Decrypt Backup Root' },
        async () => {
          return (await Crypto.decryptAndDecode(
            cipher,
            dagCBOR,
            backupRoot
          )) as BackupModel
        }
      )

      // Step 3: Fetch dialog
      const dialogCid =
        decryptedBackupRaw['tg-miniapp-backup@0.0.1'].dialogs[
          dialogId
        ].toString()

      Sentry.addBreadcrumb({
        category: 'backup.restore',
        message: 'Fetching dialog data',
        data: { dialogCid },
      })

      const dialogResult = await getFromStoracha(dialogCid)
      const dialogDataRaw = new Uint8Array(await dialogResult.arrayBuffer())

      // Step 4: Decrypt dialog
      const decryptedDialogData = await Sentry.startSpan(
        { op: 'backup.decrypt', name: 'Decrypt Dialog Data' },
        async () => {
          return (await Crypto.decryptAndDecode(
            cipher,
            dagCBOR,
            dialogDataRaw
          )) as DialogData
        }
      )

      // Step 5: Fetch entities
      const entitiesCid = decryptedDialogData.entities.toString()

      Sentry.addBreadcrumb({
        category: 'backup.restore',
        message: 'Fetching Entities',
        data: { entitiesCid },
      })

      const entitiesResult = await getFromStoracha(entitiesCid)
      const entitiesRaw = new Uint8Array(await entitiesResult.arrayBuffer())

      // Step 6: Decrypt entities
      const restoredEntities = await Sentry.startSpan(
        { op: 'backup.decrypt', name: 'Decrypt Entities' },
        async () => {
          return (await Crypto.decryptAndDecode(
            cipher,
            dagCBOR,
            entitiesRaw
          )) as Record<string, EntityData>
        }
      )

      // Step 7: Load initial messages
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

      span.setStatus({ code: 1, message: 'ok' })

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
  )
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
  return Sentry.startSpan(
    { op: 'backup.messages', name: 'Load Messages' },
    async (span) => {
      const messages: MessageData[] = []
      let currentBatchIndex = startBatchIndex
      let currentMessageIndex = startMessageIndex
      let loadedCount = 0

      // Load all messages (text) immediately
      while (currentBatchIndex < messageBatches.length && loadedCount < limit) {
        await Sentry.startSpan(
          {
            op: 'backup.messages.batch',
            name: 'Load Message Batch',
            parentSpan: span,
          },
          async (span) => {
            const messageLink = messageBatches[currentBatchIndex]

            span.setAttributes({
              batchIndex: currentBatchIndex,
              messageLink: messageLink.toString(),
            })
            Sentry.addBreadcrumb({
              category: 'backup.messages.batch',
              message: 'Fetching message batch',
              data: {
                batchIndex: currentBatchIndex,
                messageLink: messageLink.toString(),
              },
            })

            const messagesResult = await getFromStoracha(messageLink.toString())
            const encryptedMessageData = new Uint8Array(
              await messagesResult.arrayBuffer()
            )

            const decryptedMessageData = await Sentry.startSpan(
              {
                op: 'backup.messages.decrypt',
                name: 'Decrypt Message Batch',
                parentSpan: span,
              },
              async () => {
                return (await Crypto.decryptAndDecode(
                  cipher,
                  dagCBOR,
                  encryptedMessageData
                )) as MessageData[]
              }
            )

            const remainingInBatch =
              decryptedMessageData.length - currentMessageIndex
            const toLoadFromBatch = Math.min(
              remainingInBatch,
              limit - loadedCount
            )

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
        )
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
        (currentBatchIndex === messageBatches.length - 1 &&
          currentMessageIndex > 0)

      span.setStatus({ code: 1, message: 'ok' })

      return {
        messages,
        lastBatchIndex: currentBatchIndex,
        lastMessageIndex: currentMessageIndex,
        hasMoreMessages,
      }
    }
  )
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
