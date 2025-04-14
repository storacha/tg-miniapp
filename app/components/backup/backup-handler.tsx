import { useState, FormEventHandler } from 'react'
import { cloudStorage } from "@telegram-apps/sdk-react"
import { TelegramClient, Api } from '@/vendor/telegram'
import { useTelegram } from '@/providers/telegram'
import { useW3 as useStoracha, SpaceDID } from '@storacha/ui-react'
import { Period } from './dates'
import { Button } from '../ui/button'
import * as Crypto from '../../lib/crypto'
export interface BackupHandlerProps {
    chats: Set<bigint>
    space: SpaceDID
    period: Period
    onSubmit: () => unknown
}
export interface BackupMetadata {
    userTelegramId: number
    storachaAccount: string
    space: string
    cid?: string
    chatCids: string[]
    chats: Array<string>
    size: number
    points?: number
    date: number
    period: {from?: number, to?: number}
}

const STORACHA_GATEWAY = 'https://w3s.link/ipfs'

export function calculatePoints(sizeInBytes: number): number {
    const POINTS_PER_BYTE = Number(process.env.NEXT_PUBLIC_POINTS_PER_BYTE) ?? 1
    return sizeInBytes * POINTS_PER_BYTE
}

function getMediaType(media: object) {
    if (!media) return null
    switch (media._) {
        case 'messageMediaPhoto':
            return 'photo'
        case 'messageMediaDocument':
            return 'document'
        case 'messageMediaWebPage':
            return 'webpage'
        case 'messageMediaGeo':
            return 'location'
        default:
            return 'file'
    }
}

async function formatMessage(client: TelegramClient, message: Api.Message, mediaCid?: string) {
    let fromId = null
    let senderName = 'Unknown'

    try {
        const fromType = message.fromId?.className
        if (fromType) {
            const entity = await client.getEntity(fromId)
            if (fromType === "PeerUser") {
                fromId = message.fromId?.userId.toString()
                // @ts-ignore this is a entity of type User
                senderName = `${entity.firstName ?? ''} ${entity.lastName ?? ''}`.trim()
            } else if (fromType === "PeerChat") {
                fromId = message.fromId?.chatId.toString()
                // @ts-ignore this is a entity of type Chat
                senderName = entity.title ?? 'Group'
            } else if (fromType === "PeerChannel") {
                fromId = message.fromId?.channelId.toString()
                // @ts-ignore this is a entity of type Channel
                senderName = entity.title ?? 'Channel'
            }
        }
    } catch (err) {
        console.warn(`Failed to fetch entity info for fromId ${message.fromId}`)
    }

    const media = message.media ? 
        {
            mediaType: getMediaType(message.media),
            mediaCid
        } 
        : null

    return {
        id: message.id.toString(),
        date: message.date,
        from: {
            id: fromId,
            name: senderName,
        },
        text: message.message,
        media,
        reactions: [], // Optional: would be nice to include it in the future
        replies: [],  // Optional: would be nice to include it in the future.
        raw: JSON.stringify(message)
    }
}

export function BackupHandler({ chats, space, period, onSubmit }: BackupHandlerProps) {
    const [{ client: storachaClient, accounts }] = useStoracha()
    const [{ client: telegramClient, user }] = useTelegram()
    const [isBackingUp, setIsBackingUp] = useState(false)
    const [progress, setProgress] = useState(0)
    const storachaAccount = accounts[0].did()
    const startDate = period[0]
    const endDate = period[1] === Infinity || !period[1] ? Math.floor(Date.now() / 1000) : period[1]

    const handleBackup: FormEventHandler = async (e) => {
        e.preventDefault()
        setIsBackingUp(true)
    
        if (!storachaClient) {
            throw new Error('missing Storacha client instance')
        }

        if(!telegramClient.connected){
            await telegramClient.connect()
        }

        let userKey: string
        if (cloudStorage.setItem.isAvailable()) {
            userKey = await cloudStorage.getItem('user-key')

            if(!userKey){
                console.log('generating user key...')
                userKey = Crypto.generateRandomPassword()
                await cloudStorage.setItem('user-key', userKey)
            }
        }else{
            throw new Error('unable to access cloud storage')
        }

        try {
            const chatCids = []
            let totalSize = 0
            console.log('chats: ', chats)
            const selectedChats = Array.from(chats)

            let count = 0
            for (const chatId of selectedChats) {
                console.log('chat ID: ', chatId)
                const messages = []
                const firstMessage = (await telegramClient.getMessages(chatId, {
                    limit: 1,
                    offsetDate: startDate,
                }))[0]
                console.log('firstMessage: ', firstMessage)
                let options: any = {offsetDate: endDate }
                if(firstMessage) {
                    options['minId'] = firstMessage.id
                }
    
                for await (const message of telegramClient.iterMessages(chatId, options)) {
                    console.log(`Message ID ${message.id}, with message: ${message.message}, text: ${message.text}, hasMedia: ${message.media != undefined}`)
                    
                    let mediaCid
                    if (message.media) {
                        try {
                            // TODO: download the media in the next app iteration
                            // const mediaBuffer = await message.downloadMedia()

                            // const mediaCid = await uploadToStoracha(mediaBuffer)

                            // formatted.media.mediaUrl = `${STORACHA_GATEWAY}/${mediaCid}`
                        } catch (err) {
                            console.error(`Error downloading media for message ${message.id}:`, err)
                        }
                    }

                    const parsedMessage = await formatMessage(telegramClient, message, mediaCid)

                    messages.push(parsedMessage)
                }

                console.log(`Backup for chat ${chatId}:`, messages)

                const backupChatData = JSON.stringify({
                    chatId: chatId.toString(),
                    messages
                })
                
                console.log('encrypting backup...')
                const encryptedContent = await Crypto.encryptContent(backupChatData, userKey)
                console.log('encryptedContent: ', encryptedContent)
                const blob = new Blob([encryptedContent], { type: 'text/plain' })
                const size = blob.size
                totalSize += size

                console.log('uploading file to storacha...')
                const cid = await storachaClient.uploadFile(blob)
                console.log('Upload CID: ', cid.toString())
                chatCids.push(cid.toString())

                count++
                setProgress(Math.round((count / selectedChats.length) * 100))
            }

            const points = calculatePoints(totalSize)

            const newBackup: BackupMetadata = {
                userTelegramId: user?.id!,
                storachaAccount,
                space,
                chatCids,
                chats: selectedChats.map(big => big.toString()),
                size: totalSize,
                points,
                date: Date.now(),
                period: {from: startDate, to: endDate}
            }

            if (cloudStorage.setItem.isAvailable()) {
                const backupKey = `bckp-${user?.id}-${newBackup.date}`
                await cloudStorage.setItem(backupKey, JSON.stringify(newBackup))
            }else{
                throw new Error('unable to access cloud storage')
            }

            console.log('Backup completed:', newBackup)
            alert('Backup completed successfully!')
        } catch (error) {
            console.error('Backup failed:', error)
            alert('Backup failed. Please try again.')
        } finally {
            setIsBackingUp(false)
            onSubmit()
        }
    }

    return (
        <>
        {!isBackingUp && (
            <form onSubmit={handleBackup}>
                <div className="w-full pt-0 px-5 flex flex-col text-center justify-center gap-2 pb-5">
                    <h1 className="text-lg font-semibold text-foreground text-center">Ready?</h1>
                    <p className="text-sm">Check the details before we start.</p>
                </div>
                <div className="flex flex-col gap-5 rounded-t-xl bg-background w-full flex-grow py-2">
                    <div className="flex space-x-2 items-center gap-2 border-b border-primary/10 p-5">
                    <p>{chats.size.toLocaleString()} Chat{chats.size === 1 ? '' : 's'}</p>
                    </div>
                    <div className="flex space-x-2 items-center gap-2 border-b border-primary/10 p-5">
                    {period[0] === 0 && period[1] == null ? (
                        <p>Period: All time</p>
                    ) : (
                        <>
                        <p>From: {new Date(startDate * 1000).toLocaleDateString()}</p>
                        <p>To: {new Date(endDate * 1000).toLocaleDateString()}</p>
                        </>
                    )}
                    </div>
                    <div className="sticky bottom-0 w-full p-5">
                    <Button type="submit" className="w-full">Start Backup</Button>
                    </div>
                </div>
            </form>
        )}
        {isBackingUp && (
            <div className="flex flex-col items-center py-5">
                <div className="bg-background rounded-sm p-4 w-full">
                    <h2 className="text-left text-lg font-semibold">Backup in Progress</h2>
                    <div className="w-full bg-gray-200 rounded-full h-4 my-2">
                        <div
                            className="bg-blue-500 h-4 rounded-full"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-gray-500 text-sm">
                        {progress}% &nbsp; {chats.size} chat{chats.size === 1 ? '' : 's'} being backed up
                    </p>
                </div> 
            </div>
        )}
        </>
    )
}