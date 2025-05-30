'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { useTelegram } from '@/providers/telegram'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

import { Media } from '@/components/ui/media'
import { Layouts } from '@/components/layouts'
import { decodeStrippedThumb, getInitials, toJPGDataURL } from '@/lib/utils'
import { DialogData, EntityData, EntityType, MediaData, MessageData, ServiceMessageData } from '@/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ConnectError } from '@/components/backup/connect'
import { useBackups } from '@/providers/backup'
import { getNormalizedEntityId } from '@/lib/backup/utils'
import { ChatHeader } from '@/components/layouts/chat-header'
import { Loading } from '@/components/ui/loading'

type BackupDialogProps = {
  userId: string
  dialog: DialogData
  messages: (MessageData | ServiceMessageData)[]
  mediaMap: Record<string, Uint8Array>
  participants: Record<string, EntityData>
  onScrollTop: () => void 
}

const formatTime = (timestamp: number) => (new Date(timestamp * 1000)).toLocaleTimeString(undefined, {hour: '2-digit',
  minute: '2-digit'})
const formatDate = (timestamp: number) => ((new Date(timestamp * 1000)).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }))

const Message: React.FC<{isOutgoing: boolean; date: number; message: string}> = ({isOutgoing, date, message}) => {
  return (
    <div
      className={`px-4 py-2 text-sm rounded-xl whitespace-pre-line shadow-sm break-words min-w-[100px] ${
        isOutgoing
          ? 'bg-blue-500 text-white rounded-br-none'
          : 'bg-gray-100 text-foreground rounded-bl-none'
      }`}
    >
      {message &&
        (<p>{message}</p>) 
      }

      <div className={`text-xs text-right mt-1 ${
        isOutgoing
          ? 'text-gray-300'
          : 'text-muted-foreground'
        }`}>
        {formatTime(date)}
      </div>

    </div>
  )
}

const MessageWithMedia: React.FC<{
  isOutgoing: boolean; 
  date: number; 
  message?: string; 
  mediaUrl?: string; 
  metadata: MediaData
}> = ({isOutgoing, date, message, mediaUrl, metadata}) => {
  return (
    <>
      <div className={`${message ? 'bg-muted rounded-t-xl overflow-hidden' : 'mt-2'}`}>
        <Media mediaUrl={mediaUrl} metadata={metadata} time={message ? undefined : formatTime(date)} />
      </div>
      {
        message && 
          <div
            className={`px-4 py-2 text-sm rounded-xl rounded-t-none whitespace-pre-line shadow-sm break-words ${
            isOutgoing
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-gray-100 text-foreground rounded-bl-none'
            }`}
          >
            <p>{message}</p>
            <div className={`text-xs text-right mt-1 ${
            isOutgoing
              ? 'text-gray-300'
              : 'text-muted-foreground'
            }`}>
            {formatTime(date)}
            </div>
          </div>
        }
    </>
  )
}

const ServiceMessage: React.FC<{text: string}> = ({text}) => {
  return (
    <div className="flex justify-center">
      <div className="px-2 py-1 bg-muted rounded-full">
      <p className="text-xs text-center">{text}</p>
      </div>
    </div>
  )
}

const UserInfo: React.FC<{thumbSrc: string, userName: string}> = ({thumbSrc, userName}) => {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Avatar>
        <AvatarImage src={thumbSrc} /> 
        <AvatarFallback>{getInitials(userName)}</AvatarFallback>
      </Avatar>
      <p className="text-xs text-muted-foreground font-medium">
        {userName}
      </p>
    </div>
  )
}

function BackupDialog({
  userId,
  dialog,
  messages,
  mediaMap,
  participants,
  onScrollTop,
}: BackupDialogProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const sortedMessages = [...messages].sort((a, b) => a.date - b.date)
  let lastRenderedDate: string | null = null
  let lastSenderId: string | null = null
  
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
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {sortedMessages
          .filter((msg) => msg.type !== "service") // TODO: handle this 
          .map((msg) => {
          const date = formatDate(msg.date)
          const showDate = lastRenderedDate !== date
          if (showDate) lastRenderedDate = date

          const isOutgoing = msg.from === userId
  
          const sender = msg.from
            ? participants[msg.from]?.name ?? 'Unknown'
            : 'Anonymous'

          const showSenderHeader = !isOutgoing && lastSenderId !== msg.from
          lastSenderId = msg.from ?? null
            
          let thumbSrc = ''
          if(msg.from && participants[msg.from].photo?.strippedThumb){
            thumbSrc = toJPGDataURL(decodeStrippedThumb(participants[msg.from].photo?.strippedThumb as Uint8Array))
          }
         
          let mediaUrl: string | undefined
          if (msg.media?.content) {
            const rawContent = mediaMap[msg.media.content.toString()]
            const type = msg.media.metadata.type === 'document' ?  msg.media.metadata.document?.mimeType : ''
            mediaUrl = URL.createObjectURL(new Blob([rawContent], {type: type}))
          }

          return (
            <Fragment key={msg.id}>
            { showDate && <ServiceMessage text={date} />}
            {/* { msg.type === 'service' && <ServiceMessage text={msg.action.description} /> } // TODO: would be nice to have a description for each action */} 
            { msg.type === 'message' &&
                <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                  <div className="flex flex-col max-w-[75%]">
                    {showSenderHeader && (<UserInfo thumbSrc={thumbSrc} userName={sender} />)}
                    { msg.media 
                      ? <MessageWithMedia 
                          isOutgoing={isOutgoing} 
                          date={msg.date} 
                          message={msg.message} 
                          metadata={msg.media.metadata} 
                          mediaUrl={mediaUrl}
                        />
                      : <Message isOutgoing={isOutgoing} date={msg.date} message={msg.message}/>
                    }
                  </div>
                </div>
              }
            </Fragment>
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
        const userId = await getMe()
        if(!userId) return 
        setUserId(userId)
        await restoreBackup(backupCid!, normalizedId, 50)
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

      {restoredBackup.loading || !userId ? (
        <div className="flex flex-col items-center justify-center h-screen">
          <div className="text-lg font-semibold text-center"><Loading /></div>
        </div>
      ) : restoredBackup.item ? (
        <BackupDialog
          userId={userId}
          dialog={restoredBackup.item.dialogData}
          messages={restoredBackup.item.messages}
          mediaMap={restoredBackup.item.mediaMap}
          participants={restoredBackup.item.participants}
          onScrollTop={handleFetchMoreMessages}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-screen">
          <p className="text-lg font-semibold text-red-500">Dialog not found</p>
        </div>
      )}
    </Layouts>
  )
}
