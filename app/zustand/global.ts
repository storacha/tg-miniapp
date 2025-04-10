import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
	id: number
	name: string
	email: string
}

interface GlobalState {
	isOnboarded: boolean
	isTgAuthorized: boolean
	isStrochaAuthorized: boolean
	user: User | null
	phoneNumber: string

	setIsOnboarded: (isOnboarded: boolean) => void
	setIsTgAuthorized: (isTgAuthorized: boolean) => void
	setIsStrochaAuthorized: (isStrochaAuthorized: boolean) => void
	setUser: (user: User) => void
	setPhoneNumber: (phone: string) => void
}

export const useGlobal = create<GlobalState>()(
	persist(
		(set) => ({
			isOnboarded: false,
			isTgAuthorized: false,
			isStrochaAuthorized: false,
			user: null,
			phoneNumber: '',
			setIsOnboarded: (isOnboarded) => set({ isOnboarded }),
			setIsTgAuthorized: (isTgAuthorized) => set({ isTgAuthorized }),
			setIsStrochaAuthorized: (isStrochaAuthorized) => set({ isStrochaAuthorized }),
			setUser: (user) => set({ user }),
			setPhoneNumber: (phoneNumber) => set({ phoneNumber })
		}),
		{
			name: 'global-storage',
		},
	),
)
