'use client'

import { useEffect, useRef, useState } from 'react'
import { useTelegram } from '@/providers/telegram'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

import { Media } from '@/components/ui/media'
import { Layouts } from '@/components/layouts'
import { decodeStrippedThumb, getInitials, toJPGDataURL } from '@/lib/utils'
import { DialogData, EntityData, EntityType, MessageData, ServiceMessageData } from '@/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ConnectError } from '@/components/backup/connect'
import { useBackups } from '@/providers/backup'
import { getNormalizedEntityId } from '@/lib/backup/utils'
import { ChatHeader } from '@/components/layouts/chat-header'

type BackupDialogProps = {
  userId: string
  dialog: DialogData
  messages: (MessageData | ServiceMessageData)[]
  participants: Record<string, EntityData>
  onScrollTop: () => void 
}

const formatDate = (timestamp: number) => (new Date(timestamp * 1000)).toLocaleString()


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
    <div className="flex flex-col bg-background">

      <ChatHeader image={dialogThumbSrc} name={dialog.name} type={dialog.type}/>

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
  const [{}, {getMe}] = useTelegram()
  const [{ restoredBackup }, { restoreBackup, fetchMoreMessages }] = useBackups()
  const {id, cid: backupCid} = useParams<{ id: string, cid: string }>()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') as EntityType
  const [userId, setUserId] = useState<string>()
  
  useEffect(() => {
    const normalizedId = getNormalizedEntityId(id, type)

    const fetchBackup = async () => {
      try {
        const userId = await getMe()
        setUserId(userId)

        await restoreBackup(backupCid!, normalizedId, 50)
      } catch (error) {
        console.error('Error in useEffect:', error)
        
      }
    }

    fetchBackup()
  }, [backupCid, id, restoreBackup, getMe])

  const handleFetchMoreMessages = async () => {
    return fetchMoreMessages(restoredBackup.item?.messages.length || 0, 50)
  }

  return (
    <Layouts isSinglePage withHeader={false}>
       {restoredBackup.error && (
          <ConnectError
            open={!!restoredBackup.error}
            error={restoredBackup.error}
            onDismiss={() => router.back()}
          />
        )}

        {restoredBackup.loading ? (
          <div className="flex flex-col items-center justify-center h-screen">
            <p className="text-lg font-semibold text-center">Loading...</p>
          </div>
        ) : (
          !restoredBackup.item ? (
            <div className="flex flex-col items-center justify-center h-screen">
              <p className="text-lg font-semibold text-red-500">Dialog not found</p>
            </div>
          ) : (
            userId && restoredBackup.item && (
              <BackupDialog
                userId={userId}
                dialog={restoredBackup.item.dialogData}
                messages={restoredBackup.item.messages}
                participants={restoredBackup.item.participants}
                onScrollTop={handleFetchMoreMessages}
              />
            )
          )
        )}
    </Layouts>
  )
}
