import { createLogger } from '@/lib/server/logger'
import { getSession } from '@/lib/server/session'
import { getLeaderboardWithRanking } from '@/lib/server/users'

const logger = createLogger({ route: 'api/leaderboard' })

export async function GET() {
  try {
    const session = await getSession()

    logger.addContext({ accountDID: session.accountDID })
    logger.info('Validating session for leaderboard')

    if (!session.telegramAuth || !session.spaceDID) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await getLeaderboardWithRanking(
      session.telegramAuth.session,
      session.spaceDID
    )

    logger.info('leaderboard fetched:', { result })

    return Response.json(result)
  } catch (error) {
    logger.error('Leaderboard API error', { error })
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
