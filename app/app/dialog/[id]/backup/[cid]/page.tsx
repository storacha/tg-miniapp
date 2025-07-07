'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useTelegram } from '@/providers/telegram'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

import { Media } from '@/components/ui/media'
import { Layouts } from '@/components/layouts'
import { decodeStrippedThumb, getInitials, toJPGDataURL } from '@/lib/utils'
import {
  DialogData,
  EntityData,
  EntityType,
  MediaData,
  MessageData,
  ServiceMessageData,
} from '@/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ConnectError } from '@/components/backup/connect'
import { useBackups } from '@/providers/backup'
import { getNormalizedEntityId } from '@/lib/backup/utils'
import { ChatHeader } from '@/components/layouts/chat-header'
import { Loading } from '@/components/ui/loading'

type BackupDialogProps = {
  userId: string
  dialog: DialogData
  isLoading: boolean
  messages: (MessageData | ServiceMessageData)[]
  mediaMap: Record<string, Uint8Array>
  participants: Record<string, EntityData>
  onScrollBottom: () => Promise<void>
}

const formatTime = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
const formatDate = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

const INITIAL_MESSAGE_BATCH_SIZE = 20

const Message: React.FC<{
  isOutgoing: boolean
  date: number
  message: string
}> = ({ isOutgoing, date, message }) => {
  return (
    <div
      className={`px-4 py-2 text-sm rounded-xl whitespace-pre-line shadow-sm break-words min-w-[100px] ${
        isOutgoing
          ? 'bg-blue-500 text-white rounded-br-none'
          : 'bg-gray-100 text-foreground rounded-bl-none'
      }`}
    >
      {message && <p>{message}</p>}

      <div
        className={`text-xs text-right mt-1 ${
          isOutgoing ? 'text-gray-300' : 'text-muted-foreground'
        }`}
      >
        {formatTime(date)}
      </div>
    </div>
  )
}

const MessageWithMedia: React.FC<{
  isOutgoing: boolean
  date: number
  message?: string
  mediaUrl?: string
  metadata: MediaData
}> = ({ isOutgoing, date, message, mediaUrl, metadata }) => {
  return (
    <>
      <div
        className={`${
          message ? 'bg-muted rounded-t-xl overflow-hidden' : 'mt-2'
        }`}
      >
        <Media
          mediaUrl={mediaUrl}
          metadata={metadata}
          time={message ? undefined : formatTime(date)}
        />
      </div>
      {message && (
        <div
          className={`px-4 py-2 text-sm rounded-xl rounded-t-none whitespace-pre-line shadow-sm break-words ${
            isOutgoing
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-gray-100 text-foreground rounded-bl-none'
          }`}
        >
          <p>{message}</p>
          <div
            className={`text-xs text-right mt-1 ${
              isOutgoing ? 'text-gray-300' : 'text-muted-foreground'
            }`}
          >
            {formatTime(date)}
          </div>
        </div>
      )}
    </>
  )
}

const ServiceMessage: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="flex justify-center">
      <div className="px-2 py-1 bg-muted rounded-full">
        <p className="text-xs text-center">{text}</p>
      </div>
    </div>
  )
}

const UserInfo: React.FC<{ thumbSrc: string; userName: string }> = ({
  thumbSrc,
  userName,
}) => {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Avatar>
        <AvatarImage src={thumbSrc} />
        <AvatarFallback>{getInitials(userName)}</AvatarFallback>
      </Avatar>
      <p className="text-xs text-muted-foreground font-medium">{userName}</p>
    </div>
  )
}

function BackupDialog({
  userId,
  dialog,
  messages,
  mediaMap,
  isLoading,
  participants,
  onScrollBottom,
}: BackupDialogProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  let lastRenderedDate: string | null = null
  let lastSenderId: string | null = null

  const filteredMessages: MessageData[] = useMemo(
    () =>
      messages.filter((msg): msg is MessageData => {
        // Skip all service messages for now, this should be handled later
        if (msg.type === 'service') {
          return false
        }

        /**
         * Skip unsupported media types, there's no point in showing them.
         */
        if (msg.media?.metadata?.type === 'unsupported') {
          return false
        }

        return true
      }),
    [messages]
  )

  let dialogThumbSrc = ''
  if (dialog.photo?.strippedThumb) {
    dialogThumbSrc = toJPGDataURL(
      decodeStrippedThumb(dialog.photo?.strippedThumb)
    )
  }

  useEffect(() => {
    const handleScroll = async () => {
      if (chatContainerRef.current && !isLoadingMore) {
        const { scrollTop, scrollHeight, clientHeight } =
          chatContainerRef.current
        const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 20

        if (scrolledToBottom) {
          setIsLoadingMore(true)
          await onScrollBottom()
          setIsLoadingMore(false)
        }
      }
    }

    const chatContainer = chatContainerRef.current
    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll, { passive: true })

      if (messages.length >= INITIAL_MESSAGE_BATCH_SIZE) {
        handleScroll()
      }
    }

    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener('scroll', handleScroll)
      }
    }
  }, [onScrollBottom, isLoadingMore, messages.length])

  return (
    <div className="flex flex-col bg-background h-screen">
      <ChatHeader
        image={dialogThumbSrc}
        name={dialog.name}
        type={dialog.type}
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center flex-1">
          <Loading text="Loading messages..." />
        </div>
      ) : (
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
          style={{ height: 'calc(100vh - 64px)' }} // Header height compensation
        >
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center h-full justify-center">
              <p className="text-sm italic text-muted-foreground text-center">
                No messages found in the selected time period
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const date = formatDate(msg.date)
              const showDate = lastRenderedDate !== date
              if (showDate) lastRenderedDate = date

              const isOutgoing = msg.from === userId
              const sender = msg.from
                ? (participants[msg.from]?.name ?? 'Unknown')
                : 'Anonymous'

              const showSenderHeader = !isOutgoing && lastSenderId !== msg.from
              lastSenderId = msg.from ?? null

              let thumbSrc = ''
              if (msg.from && participants[msg.from].photo?.strippedThumb) {
                thumbSrc = toJPGDataURL(
                  decodeStrippedThumb(
                    participants[msg.from].photo?.strippedThumb as Uint8Array
                  )
                )
              }

              let mediaUrl: string | undefined
              if (msg.media?.content) {
                const rawContent = mediaMap[msg.media.content.toString()]
                const type =
                  msg.media.metadata.type === 'document'
                    ? msg.media.metadata.document?.mimeType
                    : ''
                if (rawContent) {
                  mediaUrl = URL.createObjectURL(
                    new Blob([rawContent], { type })
                  )
                }
              }

              return (
                <Fragment key={msg.id}>
                  {showDate && <ServiceMessage text={date} />}
                  {msg.type === 'message' && (
                    <div
                      className={`flex ${
                        isOutgoing ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div className="flex flex-col max-w-[75%]">
                        {showSenderHeader && (
                          <UserInfo thumbSrc={thumbSrc} userName={sender} />
                        )}
                        {msg.media ? (
                          <MessageWithMedia
                            isOutgoing={isOutgoing}
                            date={msg.date}
                            message={msg.message}
                            metadata={msg.media.metadata}
                            mediaUrl={mediaUrl}
                          />
                        ) : (
                          <Message
                            isOutgoing={isOutgoing}
                            date={msg.date}
                            message={msg.message}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </Fragment>
              )
            })
          )}

          {isLoadingMore && (
            <div className="text-center py-4">
              <Loading text="Loading more messages..." />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Page() {
  const router = useRouter()
  const [{}, { getMe }] = useTelegram()
  const [
    { restoredBackup },
    { restoreBackup, fetchMoreMessages, resetBackup },
  ] = useBackups()
  const { id, cid: backupCid } = useParams<{ id: string; cid: string }>()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') as EntityType
  const [userId, setUserId] = useState<string>()

  const dialog = restoredBackup.item?.dialogData
  let dialogThumbSrc = ''
  if (restoredBackup.item?.dialogData.photo?.strippedThumb) {
    dialogThumbSrc = toJPGDataURL(
      decodeStrippedThumb(restoredBackup.item.dialogData.photo?.strippedThumb)
    )
  }

  const normalizedId = useMemo(
    () => getNormalizedEntityId(id, type),
    [id, type]
  )

  // this is so we don't get stale chat data in
  // the header (and even in the chat it flashes old messages) when people switch backed up chats
  useEffect(() => {
    if (restoredBackup.item && restoredBackup.item.backupCid !== backupCid) {
      resetBackup()
    }
  }, [id, backupCid, restoredBackup])

  useEffect(() => {
    const fetchBackup = async () => {
      const userId = await getMe()
      if (!userId) return
      setUserId(userId)
      if (
        restoredBackup.loading ||
        (restoredBackup.item && restoredBackup.item.backupCid === backupCid)
      )
        return
      await restoreBackup(backupCid!, normalizedId, INITIAL_MESSAGE_BATCH_SIZE)
    }

    fetchBackup()
  }, [backupCid, restoreBackup, getMe])

  const handleFetchMoreMessages = async () => {
    if (
      restoredBackup.item?.hasMoreMessages &&
      !restoredBackup.item?.isLoadingMore
    ) {
      console.log('Fetching more messages...')
      await fetchMoreMessages(30)
    }
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

      {restoredBackup.item && userId ? (
        <BackupDialog
          isLoading={restoredBackup.loading}
          userId={userId}
          dialog={restoredBackup.item.dialogData}
          messages={restoredBackup.item.messages}
          mediaMap={restoredBackup.item.mediaMap}
          participants={restoredBackup.item.participants}
          onScrollBottom={handleFetchMoreMessages}
        />
      ) : (
        <>
          <ChatHeader
            image={dialogThumbSrc}
            name={dialog?.name || 'Loading...'}
            type={dialog?.type || 'user'}
          />
          <div className="flex flex-col items-center justify-center flex-1">
            <Loading text="Loading messages..." />
          </div>
        </>
      )}
    </Layouts>
  )
}
