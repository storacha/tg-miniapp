import { getIronSession, IronSession } from 'iron-session'
import { cookies } from 'next/headers'

import { getServerConstants } from '@/lib/server/constants'
import { SpaceDID, TelegramAuth } from '@/api'
import { AccountDID } from '@storacha/access'

export interface TGSession {
  spaceDID: SpaceDID
  accountDID: AccountDID
  telegramAuth: TelegramAuth
}

export async function getSession(): Promise<IronSession<TGSession>> {
  const { SESSION_PASSWORD, SESSION_COOKIE_NAME } = getServerConstants()
  const session = await getIronSession<TGSession>(await cookies(), {
    password: SESSION_PASSWORD,
    cookieName: SESSION_COOKIE_NAME,
    cookieOptions: {
      secure: true,
      sameSite: 'none',
    },
  })
  return session
}

export async function clearSession() {
  const session = await getSession()
  await session.destroy()
}
