import { getIronSession, IronSession } from 'iron-session'
import { cookies } from 'next/headers'

import { getServerConstants } from '@/lib/server/constants'
import { SpaceDID, TelegramAuth } from '@/api'
import { AccountDID } from '@storacha/access'

export interface TGInitData {
  initData: string
}

export interface AuthData {
  spaceDID: SpaceDID
  accountDID: AccountDID
  session: string
}

export interface SessionData {
  telegramAuth: TelegramAuth
  spaceDID: SpaceDID
  accountDID: AccountDID
}

async function getIronSessionByName<T extends object>(
  postfix: string
): Promise<IronSession<T>> {
  const { SESSION_PASSWORD, SESSION_COOKIE_NAME } = getServerConstants()
  return await getIronSession<T>(await cookies(), {
    password: SESSION_PASSWORD,
    cookieName: SESSION_COOKIE_NAME + postfix,
    cookieOptions: {
      secure: true,
      sameSite: 'none',
    },
  })
}

export const getInitSession = async () =>
  getIronSessionByName<TGInitData>('.init')
export const getAuthSession = async () =>
  getIronSessionByName<AuthData>('.auth')
export const getSession = async (): Promise<SessionData> => {
  const initSession = await getInitSession()
  const authSession = await getAuthSession()

  return {
    telegramAuth: {
      initData: initSession.initData,
      session: authSession.session,
    },
    spaceDID: authSession.spaceDID,
    accountDID: authSession.accountDID,
  }
}

export async function clearAuthSession() {
  const session = await getAuthSession()
  session.destroy()
}

export async function clearInitSession() {
  const session = await getInitSession()
  session.destroy()
}
