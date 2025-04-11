import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { useTelegram } from '@/providers/telegram';

interface BackupHandlerProps {
    selectedChats: Set<bigint>
    startDate?: number 
    endDate?: number
}

export function BackupHandler({ selectedChats, startDate, endDate }: BackupHandlerProps) {
    const [{ client }] = useTelegram()
    const [isBackingUp, setIsBackingUp] = useState(false)

    const handleBackup = async () => {
        setIsBackingUp(true)
        try {
            for (const chatId of selectedChats) {
                const messages = []
                const firstMessage = (await client.getMessages(chatId, {
                    limit: 1,
                    offsetDate: startDate,
                }))[0]
            
                for await (const message of client.iterMessages(chatId, {
                    offsetDate: endDate,
                    minId: firstMessage.id,
                })) {
                    messages.push({
                        id: message.id,
                        text: message.message,
                        date: message.date,
                    });
                }

                // Process messages 
                console.log(`Backup for chat ${chatId}:`, messages)
            }
            alert('Backup completed successfully!')
        } catch (error) {
            console.error('Backup failed:', error)
            alert('Backup failed. Please try again.')
        } finally {
            setIsBackingUp(false)
        }
    };

    return (
        <div className="flex justify-center py-5">
            <Button onClick={handleBackup} disabled={isBackingUp || selectedChats.size === 0}>
                {isBackingUp ? 'Backing Up...' : 'Start Backup'}
            </Button>
        </div>
    )
}