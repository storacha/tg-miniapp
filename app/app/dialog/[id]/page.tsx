'use client'

import { CAR } from '@ucanto/core'
import { CID } from 'multiformats'
import { CarIndexer } from '@ipld/car'
import * as dagCBOR from '@ipld/dag-cbor'
import { useEffect, useState } from 'react'
import { exporter } from 'ipfs-unixfs-exporter'
import { MemoryBlockstore } from 'blockstore-core'
import { useTelegram } from '@/providers/telegram'
import { cloudStorage} from '@telegram-apps/sdk-react'
import { useParams, useSearchParams } from 'next/navigation'

import * as Crypto from '@/lib/crypto'
import { Layouts } from '@/components/layouts'
import { Media } from '@/components/ui/media'
import { useBackups } from '@/providers/backup'
import { BackupModel, DialogData, EntityData, MessageData } from '@/api'

export const runtime = 'edge'

type BackupDialogProps = {
  dialog: DialogData
  messages: MessageData[]
  participants: Record<string, EntityData>
}

export function BackupDialog({
  dialog,
  messages,
  participants,
}: BackupDialogProps) {
  const sortedMessages = [...messages].sort((a, b) => a.date - b.date)
  const selfId = dialog.id

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-border bg-muted">
        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-white">
          {dialog.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{dialog.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">{dialog.type}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {sortedMessages.map((msg) => {
          const isOutgoing = msg.from === selfId
          const sender = participants[msg.from]?.name ?? 'Unknown'

          return (
            <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
              <div className="flex flex-col max-w-[75%]">
                {!isOutgoing && (
                  <p className="text-xs text-muted-foreground mb-1 font-medium">
                    {sender}
                  </p>
                )}
                <div
                  className={`px-4 py-2 text-sm rounded-xl whitespace-pre-line shadow-sm ${
                    isOutgoing
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-gray-100 text-foreground rounded-bl-none'
                  }`}
                >
                  <p>{msg.message || '...'}</p>
                  <div className="text-xs text-muted-foreground text-right mt-1">
                    {msg.date}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <Media mediaType="image" mediaUrl={"https://pbs.twimg.com/profile_images/1870215288886611968/uh8Kub12_400x400.png"} />
      </div>
    </div>
  )
}


const getEncryptedDataFromCar = async (car: Uint8Array, encryptedDataCID: string) => {
  // NOTE: convert CAR to a block store
  const iterable = await CarIndexer.fromBytes(car)
  const blockstore = new MemoryBlockstore()

  for await (const { cid, blockLength, blockOffset } of iterable) {
    const blockBytes = car.slice(blockOffset, blockOffset + blockLength)
    await blockstore.put(cid, blockBytes)
  }

  // NOTE: get the encrypted Data from the CAR file
  const encryptedDataEntry = await exporter(
    CID.parse(encryptedDataCID),
    blockstore
  )
  const encryptedDataBytes = new Uint8Array(Number(encryptedDataEntry.size))
  let offset = 0
  for await (const chunk of encryptedDataEntry.content()) {
    encryptedDataBytes.set(chunk, offset)
    offset += chunk.length
  }

  return encryptedDataBytes
}

const getFromStoracha = async (cid: string) => {
  const url = new URL(`/ipfs/${cid}`, process.env.NEXT_PUBLIC_STORACHA_GATEWAY_URL)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText} ${url}`);
  }
  return response
}


export default function Page () {
  const [{ client }] = useTelegram()
  const [{ backups, dialog }] = useBackups()
  const [loading, setLoading] = useState(true)
  const [dialogData, setDialogData] = useState<DialogData | null>(null)
  const [messages, setMessages] = useState<MessageData[]>([])
  const [participants, setParticipants] = useState<Record<string, EntityData>>({})
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const backupCid = searchParams.get('backupData')

  useEffect(() => {
      let cancel = false
      const restoreBackup = async () => {
        try{
          if (!client.connected) await client.connect()

          if(!cloudStorage.getKeys.isAvailable()){
            throw new Error('Error trying to access cloud storage')
          }
          let encryptionPassword = await cloudStorage.getItem('encryption-password')
          if (!encryptionPassword) {
            throw new Error('Encryption password not found in cloud storage')
          }
          
          const response = await getFromStoracha(`${backupCid}?format=car`)
          const car = new Uint8Array(await response.arrayBuffer());
          console.log('CAR file fetched');

          // decode
          const { roots } = CAR.decode(car)
          if (!roots.length) {
            throw new Error('Missing root block')
          }
          const { code } = roots[0].cid
          if (code !== dagCBOR.code) {
          throw new Error(`unexpected root CID codec: 0x${code.toString(16)}`)
          }

          console.log('decoding...')
          const root = roots[0]
          const backupRaw = dagCBOR.decode(root.bytes) as BackupModel
          console.log('Decoded CAR root')
          console.log(JSON.stringify(backupRaw))

          const id = params.id.replace('-', '')
          const dialogCid = backupRaw['tg-miniapp-backup@0.0.1'].dialogs[id].toString()
          const dialogResult = await getFromStoracha(dialogCid)
          const encryptedDialogData = new Uint8Array(await dialogResult.arrayBuffer())

          const decryptedDialogData = dagCBOR.decode(
            await Crypto.decryptContent(encryptedDialogData, encryptionPassword)
          ) as DialogData
          
          console.log(JSON.stringify(decryptedDialogData))
       
        // Restore messages and entities
          const restoredMessages: MessageData[] = [];
          for (const messageLink of decryptedDialogData.messages) {
            const messagesResult = await getFromStoracha(messageLink.toString())
            const encryptedMessageData = new Uint8Array(await messagesResult.arrayBuffer())
            const decryptedMessageData = dagCBOR.decode(
              await Crypto.decryptContent(encryptedMessageData, encryptionPassword)
            ) as MessageData[]
            restoredMessages.push(...decryptedMessageData)
          }
    
          const restoredEntities: Record<string, EntityData> = {}
          const entitiesResult = await getFromStoracha(decryptedDialogData.entities.toString())
          const encryptedEntitiesData = new Uint8Array(await entitiesResult.arrayBuffer())
          const decryptedEntitiesData = dagCBOR.decode(
            await Crypto.decryptContent(encryptedEntitiesData, encryptionPassword)
          ) as Record<string, EntityData>
          Object.assign(restoredEntities, decryptedEntitiesData)
    
          console.log('Restored messages:', restoredMessages)
          console.log(JSON.stringify(restoredMessages))
          console.log('Restored entities:', restoredEntities)
          console.log(JSON.stringify(restoredEntities))

          setLoading(false)
          setDialogData(decryptedDialogData)
          setMessages(restoredMessages)
          setParticipants(restoredEntities)

      } catch (error) {
        console.error('Error in useEffect:', error)
      }
    }
    restoreBackup()
      return () => { cancel = true }
    }, [client, backupCid, params.id])

  if ( !dialogData) { 
    return (
      <Layouts isSinglePage isBackgroundBlue>
        <div className="flex flex-col items-center justify-center h-screen">
          <p className="text-lg font-semibold text-red-500">Dialog not found</p>
          <p className="text-sm text-muted-foreground">Please select another dialog</p>
        </div>
      </Layouts>
    );
  }

  return (
    <Layouts isSinglePage isBackgroundBlue>
      { dialogData && 
        <BackupDialog dialog={dialogData} messages={messages} participants={participants} />
      }
      </Layouts>
  )
}
