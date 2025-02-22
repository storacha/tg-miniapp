import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Chat {
	id: string
	name: string
	image: string
	description: string
	messages: string[]
	createdAt: string
}

interface BackupChatState {
	chats: Chat[]
	setChats: (chats: Chat[]) => void
}

export const useBackedChats = create<BackupChatState>()(
	persist(
		(set) => ({
			chats: [],
			setChats: (chats) => set({ chats }),
		}),
		{
			name: 'global-storage',
		},
	),
)
