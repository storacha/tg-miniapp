'use client'

import { CAR } from '@ucanto/core'
import * as dagCBOR from '@ipld/dag-cbor'
import { useEffect, useState } from 'react'
import { useTelegram } from '@/providers/telegram'
import { cloudStorage} from '@telegram-apps/sdk-react'
import { useParams, useSearchParams } from 'next/navigation'

import * as Crypto from '@/lib/crypto'
import { Media } from '@/components/ui/media'
import { Layouts } from '@/components/layouts'
import { useBackups } from '@/providers/backup'
import { decodeStrippedThumb, toJPGDataURL } from '@/lib/utils'
import { BackupModel, DialogData, EntityData, MessageData } from '@/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

/**
 * TODO:
 * [] something is wrong with the message.from id, it's not the same as the user.id for the same user
 * [x] thumbnail
 * [x] text out of the box
 */

export const runtime = 'edge'

type BackupDialogProps = {
  userId: number
  dialog: DialogData
  messages: MessageData[]
  participants: Record<string, EntityData>
}

const formatDate = (timestamp: number) => (new Date(timestamp * 1000)).toLocaleString()

const getInitials = (name: string) => {
  const words = name.trim().split(' ')
  if (words.length === 1) {
    return words[0][0].toUpperCase() 
  }
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function BackupDialog({
  userId,
  dialog,
  messages,
  participants,
}: BackupDialogProps) {
  const sortedMessages = [...messages].sort((a, b) => a.date - b.date)
  
  let dialogThumbSrc = ''
  if(dialog.photo?.strippedThumb){
    dialogThumbSrc = toJPGDataURL(decodeStrippedThumb(dialog.photo?.strippedThumb))
  }
  
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-border bg-muted">
            <Avatar>
            <AvatarImage src={dialogThumbSrc} />
            <AvatarFallback className='bg-gray-300'>{getInitials(dialog.name)}</AvatarFallback>
          </Avatar>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{dialog.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">{dialog.type}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {sortedMessages.map((msg, index) => {
          const isOutgoing = msg.from === String(userId)
          const sender = participants[msg.from]?.name ?? 'Unknown'

          const showSenderHeader =
            !isOutgoing &&
            (index === 0 || sortedMessages[index - 1].from !== msg.from)

          let thumbSrc = ''
          if(participants[msg.from].photo?.strippedThumb){
           thumbSrc = toJPGDataURL(decodeStrippedThumb(participants[msg.from].photo?.strippedThumb!))
          }

          return (
            <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
              <div className="flex flex-col max-w-[75%]">
                {showSenderHeader && (
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar>
                      <AvatarImage src={thumbSrc} /> 
                      <AvatarFallback>{getInitials(sender)}</AvatarFallback>
                    </Avatar>
                    <p className="text-xs text-muted-foreground font-medium">
                      {sender}
                    </p>
                  </div>
                )}
                <div
                  className={`px-4 py-2 text-sm rounded-xl whitespace-pre-line shadow-sm break-words ${
                    isOutgoing
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-gray-100 text-foreground rounded-bl-none'
                  }`}
                >
                  {msg.message ? 
                    (<p>{msg.message}</p>) :
                    (<Media  />)
                  }
                  <div className={`text-xs text-right mt-1 ${
                    isOutgoing
                      ? 'text-gray-300'
                      : 'text-muted-foreground'
                    }`}>
                    {formatDate(msg.date)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
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
  const [{ client, user }] = useTelegram()
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
          console.log('CAR file fetched')

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
          // console.log(JSON.stringify(backupRaw))

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
    
          // console.log(JSON.stringify(restoredMessages))
          // console.log(JSON.stringify(restoredEntities))

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

  return (
    <Layouts isSinglePage isBackgroundBlue>
      {loading && <p className='text-center'>Loading...</p> }
      {!loading && !dialogData && 
        <div className="flex flex-col items-center justify-center h-screen">
          <p className="text-lg font-semibold text-red-500">Dialog not found</p>
        </div>
      }
      {dialogData && 
        <BackupDialog userId={user?.id!} dialog={dialogData} messages={messages} participants={participants} />
      }
    </Layouts>
  )
}
