import { createLogger } from '@/lib/server/logger'
import { getSession } from '@/lib/server/session'
import { getRanking } from '@/lib/server/users'

const logger = createLogger({ route: 'api/ranking' })

export async function GET() {
  try {
    const session = await getSession()

    logger.addContext({ accountDID: session.accountDID })
    logger.info('Validating session for ranking')

    if (!session.telegramAuth || !session.spaceDID) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ranking = await getRanking(
      session.telegramAuth.session,
      session.spaceDID
    )
    logger.info('Ranking fetched:', { ranking })

    return Response.json(ranking)
  } catch (error) {
    logger.error('Ranking API error', { error })
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
