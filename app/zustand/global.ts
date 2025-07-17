import { Session, StringSession } from '@/vendor/telegram/sessions'
import { useSignal, initData } from '@telegram-apps/sdk-react'
import { SpaceDID } from '@storacha/ui-react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Buffer } from 'buffer/'
const CURRENT_VERSION = '1'

interface User {
  id: number
  name: string
  email?: string
}

const saveSessionToString = (session?: Session | string) => {
  if (typeof session === 'string') {
    return session
  }
  // This code is copied from
  // https://github.com/gram-js/gramjs/blob/master/gramjs/sessions/StringSession.ts#L95-L124
  // note that "Buffer" here is not node:buffer but the 'buffer' package
  if (!session || !session.authKey || !session.serverAddress || !session.port) {
    return ''
  }
  // TS is weird
  const key = session.authKey.getKey()
  if (!key) {
    return ''
  }
  const dcBuffer = Buffer.from([session.dcId])
  const addressBuffer = Buffer.from(session.serverAddress)
  const addressLengthBuffer = Buffer.alloc(2)
  addressLengthBuffer.writeInt16BE(addressBuffer.length, 0)
  const portBuffer = Buffer.alloc(2)
  portBuffer.writeInt16BE(session.port, 0)

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
  )
}

interface GlobalState {
  isFirstLogin: boolean
  isOnboarded: boolean
  isStorachaAuthorized: boolean
  user: User | null
  phoneNumber: string
  space: SpaceDID | null
  tgSessionString: string

  setIsFirstLogin: (isFirstLogin: boolean) => void
  setIsOnboarded: (isOnboarded: boolean) => void
  setIsStorachaAuthorized: (isStorachaAuthorized: boolean) => void
  setUser: (user: User) => void
  setPhoneNumber: (phone: string) => void
  setSpace: (space: SpaceDID | null) => void
  setTgSessionString: (session?: Session | string) => void
}

// Create a factory function that generates user-specific stores
const createUserGlobalStore = (userId: number) => {
  return create<GlobalState>()(
    persist(
      (set) => ({
        isFirstLogin: true,
        isOnboarded: false,
        isStorachaAuthorized: false,
        user: null,
        phoneNumber: '',
        space: null,
        tgSessionString: '',
        setIsFirstLogin: (isFirstLogin) => set({ isFirstLogin }),
        setIsOnboarded: (isOnboarded) => set({ isOnboarded }),
        setIsStorachaAuthorized: (isStorachaAuthorized) =>
          set({ isStorachaAuthorized }),
        setUser: (user) => set({ user }),
        setPhoneNumber: (phoneNumber) => set({ phoneNumber }),
        setSpace: (space) => set({ space }),
        setTgSessionString: (tgSessionString) =>
          set({ tgSessionString: saveSessionToString(tgSessionString) }),
      }),
      {
        name: `global-storage-${userId}`, // Each user gets their own storage key
      }
    )
  )
}

// Cache to store user-specific stores
const userStores = new Map<number, ReturnType<typeof createUserGlobalStore>>()

// Function to get or create a store for a specific user
export const getUserGlobalStore = (userId: number) => {
  if (!userStores.has(userId)) {
    userStores.set(userId, createUserGlobalStore(userId))
  }
  return userStores.get(userId)!
}

// Hook that uses the current user's store
export const useGlobal = () => {
  // On server side, return a temporary store
  if (typeof window === 'undefined') {
    return getUserGlobalStore(-1)() // Use -1 to clearly indicate SSR
  }

  // on the client we should be reliably able to call this
  const user = useSignal(initData.user)

  // but if the user isn't defined for some reason, that's an error
  if (!user) {
    throw new Error(
      'No Telegram user available - useGlobal must be used within a Telegram Mini App context'
    )
  }

  return getUserGlobalStore(user.id)()
}
