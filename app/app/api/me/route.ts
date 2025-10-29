import { getErrorMessage } from '@/lib/errorhandling'
import { createLogger } from '@/lib/server/logger'
import { getSession } from '@/lib/server/session'
import { getMe } from '@/lib/server/telegram'

const logger = createLogger({ route: 'api/me' })

export async function GET() {
  try {
    const session = await getSession()

    logger.addContext({ accountDID: session.accountDID })
    logger.info('Validating session for getting me')

    if (!session.telegramAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = await getMe(session.telegramAuth.session)
    return Response.json({ userId })
  } catch (error) {
    logger.error('get Me API error', { error })
    const errorMsg = getErrorMessage(error)

    if (
      errorMsg.includes('client authorization failed') ||
      errorMsg.includes('AUTH_KEY_DUPLICATED')
    ) {
      return Response.json(
        { error: 'Telegram Client is Unauthorized' },
        { status: 401 }
      )
    }

    return Response.json(
      { error: 'Internal Server Error', cause: error },
      { status: 500 }
    )
  }
}
