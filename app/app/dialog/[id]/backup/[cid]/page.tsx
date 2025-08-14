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
import { useProfilePhoto } from '@/components/backup/useProfilePhoto'

type BackupDialogProps = {
  userId: string
  dialog: DialogData
  isLoading: boolean
  messages: (MessageData | ServiceMessageData)[]
  mediaMap: Record<string, Uint8Array>
  participants: Record<string, EntityData>
  onScrollBottom: () => Promise<void>
  dialogThumbSrc: string
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

const formatServiceMessage = (
  msg: ServiceMessageData,
  participants: Record<string, EntityData>
): string => {
  const { action, from } = msg

  const getUserName = (userId?: string) =>
    userId ? (participants[userId]?.name ?? 'A user') : 'A user'

  switch (action.type) {
    case 'chat-create':
      return `Chat was created with title "${action.title}"`
    case 'chat-edit-title':
      return `Group title was changed to "${action.title}"`
    case 'chat-edit-photo':
      return `${getUserName(from)} updated the group photo`
    case 'chat-delete-photo':
      return `${getUserName(from)} removed the group photo`
    case 'chat-add-user':
      const addedUsers = action.users.length
      return `${addedUsers > 1 ? `${addedUsers} users` : 'A user'} joined the group`
    case 'chat-delete-user':
      return `${getUserName(action.user)} was removed from the group`
    case 'chat-joined-by-link':
      return `${getUserName(from)} joined via an invite link`
    case 'chat-joined-by-request':
      return `${getUserName(from)} joined the chat by request`
    case 'pin-message':
      return `${getUserName(from)} pinned a message`
    case 'screenshot-taken':
      return `${getUserName(from)} took a screenshot`
    case 'history-clear':
      return `The chat history was cleared`
    case 'channel-create':
      return `Channel "${action.title}" was created.`
    case 'boost-apply':
      return `${action.boosts} boost(s) applied.`
    case 'bot-allowed':
      const botDetails = []
      if (action.attachMenu) botDetails.push('attach menu enabled')
      if (action.fromRequest) botDetails.push('allowed via request')
      else botDetails.push('allowed')
      if (action.domain) botDetails.push(`domain: ${action.domain}`)
      if (action.app?.type === 'default') {
        botDetails.push(`app: ${action.app.title}`)
      }
      return `Bot ${botDetails.join(', ')}.`
    case 'channel-migrate-from':
      return `This is a channel migrated from chat "${action.title}" (ID ${action.chat}).`
    case 'chat-migrate-to':
      return `This group was migrated to the channel with ID ${action.channel}.`
    case 'contact-sign-up':
      return `A contact in this chat signed up.`
    case 'custom-action':
      return action.message
    case 'game-score':
      return `Game score updated: game ${action.game}, score ${action.score}.`
    case 'geo-proximity-reached':
      return `Geo‑proximity reached between ${action.from} and ${action.to} (${action.distance}m apart).`
    case 'gift-code': {
      const parts: string[] = []
      parts.push(`Gift code ${action.slug} for ${action.months} month(s)`)
      if (action.viaGiveaway) {
        parts.push(`via giveaway`)
      }
      parts.push(action.unclaimed ? `unclaimed` : `claimed`)
      if (action.amount && action.currency) {
        parts.push(`${action.amount} ${action.currency}`)
      }
      if (action.cryptoAmount && action.cryptoCurrency) {
        parts.push(`plus ${action.cryptoAmount} ${action.cryptoCurrency}`)
      }
      if (action.message) {
        parts.push(`message: "${action.message.text}"`)
      }
      return parts.join(', ') + '.'
    }
    case 'gift-premium': {
      const parts: string[] = [
        `${action.amount} ${action.currency} premium gift for ${action.months} month(s)`,
      ]
      if (action.cryptoCurrency && action.cryptoAmount) {
        parts.push(
          `plus ${action.cryptoAmount} ${action.cryptoCurrency} in crypto`
        )
      }
      if (action.message) {
        parts.push(`message: "${action.message.text}"`)
      }
      return parts.join('; ') + '.'
    }
    case 'gift-stars':
      return `${action.amount} ${action.currency} stars gifted (total stars: ${action.stars}).`
    case 'giveaway-launch':
      return `Giveaway launched${action.stars ? ` for ${action.stars} stars` : ''}.`
    case 'giveaway-results':
      return `Giveaway ended: winners — ${action.winnersCount}, unclaimed — ${action.unclaimedCount}.`
    case 'group-call':
      return `Group call started (call ID ${action.call.id}). 
                  Group call duration ${action?.duration}   `
    case 'group-call-scheduled':
      return `Group call scheduled for ${new Date(
        action.scheduleDate * 1000
      ).toLocaleString()}.`
    case 'invite-to-group-call':
      return `${action.users.join(', ')} invited to call ${action.call.id}.`
    case 'payment-refunded':
      return `Payment of ${action.totalAmount} ${action.currency} was refunded to ${action.peer}.`
    case 'payment-sent':
      return `Payment of ${action.totalAmount} ${action.currency} sent.`
    case 'payment-sent-me':
      const paymentDetails = []
      paymentDetails.push(`${action.totalAmount} ${action.currency}`)
      if (action.recurringInit)
        paymentDetails.push('recurring payment initialized')
      if (action.recurringUsed) paymentDetails.push('recurring payment used')
      if (action.info?.name) paymentDetails.push(`from ${action.info.name}`)
      if (action.shippingOptionId)
        paymentDetails.push(`shipping: ${action.shippingOptionId}`)
      return `Payment received: ${paymentDetails.join(', ')}.`
    case 'phone-call': {
      const parts: string[] = []
      parts.push(action.video ? 'Video call' : 'Audio call')
      parts.push(`ID ${action.call}`)
      if (action.reason) {
        const reason =
          action.reason.charAt(0).toUpperCase() + action.reason.slice(1)
        parts.push(`ended due to ${reason}`)
      }
      if (action.duration !== undefined) {
        const mins = Math.floor(action.duration / 60)
        const secs = action.duration % 60
        parts.push(`duration ${mins}m ${secs}s`)
      }

      return parts.join(', ') + '.'
    }
    case 'prize-stars': {
      const parts: string[] = []
      parts.push(`Prize of ${action.stars} stars`)
      parts.push(action.unclaimed ? 'unclaimed' : 'claimed')
      parts.push(`boost from ${action.boostPeer}`)
      parts.push(`giveaway message ID ${action.giveawayMsg}`)
      parts.push(`txn ${action.transaction}`)
      return parts.join(', ') + '.'
    }
    case 'requested-peer':
      return `Requested peer(s): ${action.peers.join(', ')}.`
    case 'requested-peer-sent-me': {
      if (!action.peers.length) {
        return `You received a peer request.`
      }
      const items = action.peers.map((peer) => {
        switch (peer.type) {
          case 'user': {
            const name = [peer.firstName, peer.lastName]
              .filter(Boolean)
              .join(' ')
            return name || peer.username || `user ${peer.id}`
          }
          case 'chat':
            return peer.title ? `chat "${peer.title}"` : `chat ${peer.id}`
          case 'channel':
            return peer.title
              ? `channel "${peer.title}"`
              : peer.username
                ? `@${peer.username}`
                : `channel ${peer.id}`
          default:
            return `${peer.type}`
        }
      })
      let who: string
      if (items.length === 1) {
        who = items[0]
      } else if (items.length === 2) {
        who = `${items[0]} and ${items[1]}`
      } else {
        who = `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
      }

      return `You received a peer request for ${who}.`
    }
    case 'secure-values-sent': {
      const typesList = action.types.join(', ')
      return `Secure values sent: ${typesList}.`
    }
    case 'secure-values-sent-me': {
      const summary = action.values.map((val) => {
        let desc = val.type.replace('-', ' ')
        if (val.plainData) {
          if (val.plainData.type === 'phone') {
            desc += ` (${val.plainData.phone})`
          } else if (val.plainData.type === 'email') {
            desc += ` (${val.plainData.email})`
          }
        } else {
          const parts: string[] = []
          if (val.data) parts.push('data blob')
          if (val.frontSide) parts.push('front side photo')
          if (val.reverseSide) parts.push('reverse side photo')
          if (val.selfie) parts.push('selfie')
          if (val.translation)
            parts.push(`${val.translation.length} translation file(s)`)
          if (val.files) parts.push(`${val.files.length} document file(s)`)
          if (parts.length) {
            desc += ` with ${parts.join(', ')}`
          }
        }
        return desc
      })

      return `You received secure values: ${summary.join('; ')}.`
    }
    case 'set-chat-theme':
      return `Chat theme set to "${action.emoticon}."`
    case 'set-chat-wall-paper':
      return `Chat wallpaper was changed.`
    case 'set-messages-ttl':
      return `Messages TTL set to ${action.period} seconds.`
    case 'star-gift': {
      const parts: string[] = []
      parts.push(
        `Star gift ID ${action.gift.id} for ${action.gift.stars} stars`
      )
      if (action.gift.limited) parts.push('limited edition')
      if (action.gift.soldOut) parts.push('sold out')
      if (action.gift.birthday) parts.push('birthday special')
      if (
        action.gift.availabilityRemains !== undefined &&
        action.gift.availabilityTotal !== undefined
      ) {
        parts.push(
          `availability ${action.gift.availabilityRemains}/${action.gift.availabilityTotal}`
        )
      }
      if (action.nameHidden) parts.push('name hidden')
      if (action.saved) parts.push('saved to collection')
      if (action.converted)
        parts.push(
          `converted ${action.convertStars ?? action.gift.convertStars} stars`
        )
      if (action.message) {
        parts.push(`message: "${action.message.text}"`)
      }
      return parts.join(', ') + '.'
    }
    case 'suggest-profile-photo':
      return 'Profile photo suggestion received'
    case 'topic-create':
      return `Topic "${action.title}" created.`
    case 'topic-edit':
      return `Topic edited ${action.title ? action.title : ''}.`
    case 'unknown':
      return `An unknown action occurred.`
    case 'web-view-data-sent':
      return `Web‑view data sent: ${action.text}.`
    case 'web-view-data-sent-me':
      return `You sent web‑view data: ${action.text}.`
    default:
      return `some unknown action occurred`
  }
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
  dialogThumbSrc,
}: BackupDialogProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  let lastRenderedDate: string | null = null
  let lastSenderId: string | null = null

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
          {messages.map((msg) => {
            if (
              msg.type === 'message' &&
              msg.media?.metadata?.type === 'unsupported'
            ) {
              return null
            }
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
            if (msg.from && participants[msg.from]?.photo?.strippedThumb) {
              thumbSrc = toJPGDataURL(
                decodeStrippedThumb(
                  participants[msg.from]?.photo?.strippedThumb as Uint8Array
                )
              )
            }

            let mediaUrl: string | undefined
            if (msg.type === 'message' && msg.media?.content) {
              const rawContent = mediaMap[msg.media.content.toString()]
              const type =
                msg.media.metadata.type === 'document'
                  ? msg.media.metadata.document?.mimeType
                  : ''
              if (rawContent) {
                mediaUrl = URL.createObjectURL(
                  new Blob([rawContent], { type: type })
                )
              }
            }

            return (
              <Fragment key={msg.id}>
                {showDate && <ServiceMessage text={date} />}
                {msg.type === 'service' ? (
                  <div className="flex flex-col items-center space-y-1">
                    <ServiceMessage
                      text={formatServiceMessage(msg, participants)}
                    />
                  </div>
                ) : (
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
          })}
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
    { backups, restoredBackup },
    { restoreBackup, fetchMoreMessages, resetBackup },
  ] = useBackups()
  const { id, cid: backupCid } = useParams<{ id: string; cid: string }>()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') as EntityType
  const [userId, setUserId] = useState<string>()

  const dialog = restoredBackup.item?.dialogData

  // Find the DialogInfo from backup params to get dialogId and accessHash for high quality images
  const dialogInfo = useMemo(() => {
    if (!dialog || !backups.items.length) return null

    const normalizedDialogId = getNormalizedEntityId(dialog.id, dialog.type)

    // Find the backup job that created this backup
    const relevantBackup = backups.items.find(
      (backup) =>
        backup.data === backupCid && backup.params.dialogs[normalizedDialogId]
    )

    return relevantBackup?.params.dialogs[normalizedDialogId] || null
  }, [dialog, backups.items, backupCid])

  let lqThumbSrc = ''
  if (restoredBackup.item?.dialogData.photo?.strippedThumb) {
    lqThumbSrc = toJPGDataURL(
      decodeStrippedThumb(restoredBackup.item.dialogData.photo?.strippedThumb)
    )
  }

  const hqThumbSrc = useProfilePhoto(
    dialogInfo?.dialogId,
    dialogInfo?.accessHash
  )
  const dialogThumbSrc = hqThumbSrc || lqThumbSrc

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
          dialogThumbSrc={dialogThumbSrc}
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
