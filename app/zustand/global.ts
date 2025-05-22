import { Session, StringSession } from '@/vendor/telegram/sessions'
import { SpaceDID } from '@storacha/ui-react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Buffer } from "buffer/"
const CURRENT_VERSION = "1";

interface User {
	id: number
	name: string
	email: string
}

const saveSessionToString = (session?:  Session | string ) => {
	if (typeof session === 'string'){
		return session
	}
	// This code is copied from 
	// https://github.com/gram-js/gramjs/blob/master/gramjs/sessions/StringSession.ts#L95-L124
	// note that "Buffer" here is not node:buffer but the 'buffer' package
	if (!session || !session.authKey || !session.serverAddress || !session.port) {
		return "";
	}
	// TS is weird
	const key = session.authKey.getKey();
	if (!key) {
		return "";
	}
	const dcBuffer = Buffer.from([session.dcId]);
	const addressBuffer = Buffer.from(session.serverAddress);
	const addressLengthBuffer = Buffer.alloc(2);
	addressLengthBuffer.writeInt16BE(addressBuffer.length, 0);
	const portBuffer = Buffer.alloc(2);
	portBuffer.writeInt16BE(session.port, 0);
  
	return (
		CURRENT_VERSION +
		StringSession.encode(
			Buffer.concat([
				dcBuffer,
				addressLengthBuffer,
				addressBuffer,
				portBuffer,
				key,
			])
		)
	);
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
	setTgSessionString: (session?: Session | string ) => void
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
			setTgSessionString: (tgSessionString) => set({ tgSessionString: saveSessionToString(tgSessionString) })
		}),
		{
			name: 'global-storage',
		},
	),
)
