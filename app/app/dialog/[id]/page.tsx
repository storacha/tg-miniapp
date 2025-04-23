'use client'

import { useEffect, useRef, useState } from 'react'
import { useTelegram } from '@/providers/telegram'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

import { Media } from '@/components/ui/media'
import { Layouts } from '@/components/layouts'
import { decodeStrippedThumb, toJPGDataURL } from '@/lib/utils'
import { DialogData, EntityData, MessageData, ServiceMessageData } from '@/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ConnectError } from '@/components/backup/connect'
import { useBackups } from '@/providers/backup'

export const runtime = 'edge'

type BackupDialogProps = {
  userId: string
  dialog: DialogData
  messages: (MessageData | ServiceMessageData)[]
  participants: Record<string, EntityData>
  onScrollTop: () => void 
}

const formatDate = (timestamp: number) => (new Date(timestamp * 1000)).toLocaleString()

const getInitials = (name: string) => {
  const words = name.trim().split(' ')
  if (words.length === 1) {
    return words[0][0].toUpperCase() 
  }
  return (words[0][0] + words[1][0]).toUpperCase()
}

function BackupDialog({
  userId,
  dialog,
  messages,
  participants,
  onScrollTop,
}: BackupDialogProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const sortedMessages = [...messages].sort((a, b) => a.date - b.date)
  
  let dialogThumbSrc = ''
  if(dialog.photo?.strippedThumb){
    dialogThumbSrc = toJPGDataURL(decodeStrippedThumb(dialog.photo?.strippedThumb))
  }

  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current) {
        const { scrollTop } = chatContainerRef.current
        if (scrollTop === 0) {
          onScrollTop()
        }
      }
    }

    const chatContainer = chatContainerRef.current
    chatContainer?.addEventListener('scroll', handleScroll)

    return () => {
      chatContainer?.removeEventListener('scroll', handleScroll)
    }
  }, [onScrollTop])
  
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
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {sortedMessages
          .filter((msg) => msg.type !== "service") // TODO: handle this once the message service types are defined
          .map((msg, index) => {
          const isOutgoing = msg.from === userId
          const sender = msg.from
            ? participants[msg.from]?.name ?? 'Unknown'
            : 'Anonymous'


          const showSenderHeader =
            !isOutgoing &&
            (index === 0 || sortedMessages[index - 1].from !== msg.from)

          let thumbSrc = ''
          if(msg.from && participants[msg.from].photo?.strippedThumb){
           thumbSrc = toJPGDataURL(decodeStrippedThumb(participants[msg.from].photo?.strippedThumb as Uint8Array))
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


export default function Page () {
  const router = useRouter()
  const [{ client }] = useTelegram()
  const [{ restoredBackup }, { restoreBackup, fetchMoreMessages }] = useBackups()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const backupCid = searchParams.get('backupData')
  const [userId, setUserId] = useState<string>()
  
  useEffect(() => {
    const fetchBackup = async () => {
      try {
        if (!client.connected) await client.connect()
          
        const userId = (await client.getMe()).id.toString()
        setUserId(userId)

        await restoreBackup(backupCid!, params.id, 50)
      } catch (error) {
        console.error('Error in useEffect:', error)
        
      }
    }

    fetchBackup()
  }, [client, backupCid, params.id, restoreBackup])

  const handleFetchMoreMessages = async () => {
    return fetchMoreMessages(restoredBackup.item?.messages.length || 0, 50)
  }

  return (
    <Layouts isSinglePage isBackgroundBlue>
       {restoredBackup.error && (
        <ConnectError
          open={!!restoredBackup.error}
          error={restoredBackup.error}
          onDismiss={() => router.back()}
        />
      )}
      {restoredBackup.loading && <p className="text-center">Loading...</p>}
      {!restoredBackup.loading && !restoredBackup.item && (
        <div className="flex flex-col items-center justify-center h-screen">
          <p className="text-lg font-semibold text-red-500">Dialog not found</p>
        </div>
      )}
      {userId && restoredBackup.item && (
        <BackupDialog
          userId={userId}
          dialog={restoredBackup.item.dialogData}
          messages={restoredBackup.item.messages}
          participants={restoredBackup.item.participants}
          onScrollTop={handleFetchMoreMessages}
        />
      )}
    </Layouts>
  )
}
