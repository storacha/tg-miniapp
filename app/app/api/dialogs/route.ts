import { createLogger } from '@/lib/server/logger'
import { getSession } from '@/lib/server/session'
import { listDialogs } from '@/lib/server/telegram' // From telegram.ts

const logger = createLogger({ route: 'api/dialogs' })

export async function GET(request: Request) {
  try {
    const session = await getSession()

    logger.addContext({ accountDID: session.accountDID })
    logger.info('Validating session for getting dialogs')

    if (!session.telegramAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offsetId = searchParams.get('offsetId')
      ? parseInt(searchParams.get('offsetId')!)
      : undefined
    const offsetDate = searchParams.get('offsetDate')
      ? parseInt(searchParams.get('offsetDate')!)
      : undefined
    const offsetPeer = searchParams.get('offsetPeer') || undefined

    logger.info('Fetching dialogs with params:', {
      limit,
      offsetId,
      offsetDate,
      offsetPeer,
    })

    const paginationParams = {
      limit,
      ...(offsetId && offsetId > 0 && { offsetId }),
      ...(offsetDate && offsetDate > 0 && { offsetDate }),
      ...(offsetPeer && { offsetPeer }),
    }

    logger.info('Calling listDialogs with params:', paginationParams)

    const result = await listDialogs(
      session.telegramAuth.session,
      paginationParams
    )

    logger.info('Dialogs fetched:', {
      chatsLength: result?.chats?.length || 0,
      offsetParams: result?.offsetParams,
    })

    return Response.json(result)
  } catch (error) {
    logger.error('Dialogs API error', { error })
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
