import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SpaceDID } from '@storacha/ui-react'
interface User {
	id: number
	name: string
	email: string
}
interface GlobalState {
	isOnboarded: boolean
	isTgAuthorized: boolean
	isStorachaAuthorized: boolean
	user: User | null
	phoneNumber: string
	space: SpaceDID | null
	tgSessionString: string

	setIsOnboarded: (isOnboarded: boolean) => void
	setIsTgAuthorized: (isTgAuthorized: boolean) => void
	setIsStorachaAuthorized: (isStorachaAuthorized: boolean) => void
	setUser: (user: User) => void
	setPhoneNumber: (phone: string) => void
	setSpace: (space: SpaceDID | null) => void
	setTgSessionString: (session: string ) => void
}

export const useGlobal = create<GlobalState>()(
	persist(
		(set) => ({
			isOnboarded: false,
			isTgAuthorized: false,
			isStorachaAuthorized: false,
			user: null,
			phoneNumber: '',
			space: null,
			tgSessionString: '',
			setIsOnboarded: (isOnboarded) => set({ isOnboarded }),
			setIsTgAuthorized: (isTgAuthorized) => set({ isTgAuthorized }),
			setIsStorachaAuthorized: (isStorachaAuthorized) => set({ isStorachaAuthorized }),
			setUser: (user) => set({ user }),
			setPhoneNumber: (phoneNumber) => set({ phoneNumber }),
			setSpace: (space) => set({ space }),
			setTgSessionString: (tgSessionString) => set({ tgSessionString })
		}),
		{
			name: 'global-storage',
		},
	),
)
