'use client'

import { Layouts } from '@/components/layouts'
import { useParams, useSearchParams } from 'next/navigation'
import { Backup, BackupModel, DialogData, EntityData, MessageData } from '@/api'
import { Media } from '@/components/ui/media'
import { useBackups } from '@/providers/backup'
import { useTelegram } from '@/providers/telegram'
import { cloudStorage} from '@telegram-apps/sdk-react'
import { useEffect, useState } from 'react'
import { decryptContent } from '@/lib/crypto'
import * as dagCBOR from '@ipld/dag-cbor'
import { CAR } from '@ucanto/core'
import { CID } from 'multiformats'
import { CarIndexer } from '@ipld/car'
import { exporter } from 'ipfs-unixfs-exporter'
import { MemoryBlockstore } from 'blockstore-core'
import * as Crypto from '@/lib/crypto'

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

export default function Page () {
  const [{ client }] = useTelegram()
  const [{ backups, dialog }] = useBackups()
  const [loading, setLoading] = useState(true)
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const backupCid = searchParams.get('backupData')

  useEffect(() => {
      let cancel = false
      ;(async () => {
        try{
          if (!client.connected) await client.connect()

          if(!cloudStorage.getKeys.isAvailable()){
            throw new Error('Error trying to access cloud storage')
          }
          let encryptionPassword = await cloudStorage.getItem('encryption-password')
          if (!encryptionPassword) {
            throw new Error('Encryption password not found in cloud storage');
          }
          
          // fetch from storacha
          const url = new URL(`/ipfs/${backupCid}?format=car`, process.env.NEXT_PUBLIC_STORACHA_GATEWAY_URL)
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText} ${url}`);
          }
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
          console.log(backupRaw)

          const id = params.id.replace('-', '')
          const dialogCid = backupRaw['tg-miniapp-backup@0.0.1'].dialogs[id].toString()
          
          const encryptedDialogData = await getEncryptedDataFromCar(car, dialogCid)
          console.log(JSON.stringify(encryptedDialogData))

          const decryptedDialogData = dagCBOR.decode(
            await Crypto.decryptContent(encryptedDialogData, encryptionPassword)
          ) as DialogData[]

    
        // working on

          setLoading(false)

      } catch (error) {
        console.error('Error in useEffect:', error);
      }
      })()
      return () => { cancel = true }
    }, [client])

  if (!dialog) {
    return (
      <Layouts isSinglePage isBackgroundBlue>
        <div className="flex flex-col items-center justify-center h-screen">
          <p className="text-lg font-semibold text-red-500">Dialog not found</p>
          <p className="text-sm text-muted-foreground">Please select another dialog</p>
        </div>
      </Layouts>
    );
  }

  const dialogId = params.id

  const participants: Record<string, EntityData> = {
    '123': { id: '123', name: 'Me', type: 'user' },
    '456': { id: '456', name: 'Alice', type: 'user' },
  }

  const messages = [
    {
      id: 1,
      from: '123',
      date: 1700000000,
      message: 'Hey, this is my backup!',
    },
    {
      id: 2,
      from: '456',
      date: 1700000600,
      message: 'Cool, backup with storacha.',
    },
    {
      id: 3,
      from: '123',
      date: 1700001200,
      message: 'uhuu storacha.',
    },
  ]

  // Mock data for now — in a real app you'd fetch it based on dialogId
  const dialogData: DialogData = {
    id: params.id,
    name: (dialog.name ?? dialog.title ?? '').trim() || 'Unknown',
    type: "chat",
    entities: {} as any,
    messages: [],
  }

  return (
    <Layouts isSinglePage isBackgroundBlue>
      { dialog && 
        <BackupDialog dialog={dialogData} messages={messages} participants={participants} />
      }
      </Layouts>
  )
}
