import { getDB } from '@/lib/server/db'
import { getTelegramId } from '@/lib/server/jobs'
import { getSession } from '@/lib/server/session'
import { stringifyWithUIntArrays } from '@/lib/utils'
import { createLogger } from '@/lib/server/logger'

export const dynamic = 'force-dynamic'

// Create logger for jobs API route
const logger = createLogger({ route: 'api/jobs' })

export async function GET() {
  logger.info('Setting up notification stream for job updates')
  try {
    const session = await getSession()

    const db = getDB()
    const telegramId = getTelegramId(session.telegramAuth)
    const dbUser = await db.findOrCreateUser({
      storachaSpace: session.spaceDID,
      storachaAccount: session.accountDID,
      telegramId: telegramId.toString(),
    })

    logger.info('Subscribing updates for user', {
      userId: dbUser.id,
      telegramId,
    })
    let unsubscribe: () => void
    // Create a new ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Notify client of successful connection
          controller.enqueue(encodeSSE('init', 'Connecting...'))
          unsubscribe = await db.subscribeToJobUpdates(
            dbUser.id,
            (action, job) => {
              logger.debug('Received job update', {
                action,
                jobId: job.id,
                userId: dbUser.id,
              })
              controller.enqueue(
                encodeSSE(action, stringifyWithUIntArrays(job))
              )
            }
          )
        } catch (error) {
          logger.error('Stream setup error', {
            error,
            tags: { operation: 'stream_setup' },
            user: {
              telegramId: telegramId.toString(),
              accountDID: session.accountDID,
            },
          })
          controller.enqueue(encodeSSE('error', 'Stream interrupted'))
          controller.close()
        }
      },

      cancel() {
        unsubscribe()
      },
    })

    return new Response(stream, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
      },
      status: 200,
    })
  } catch (error) {
    logger.error('Server error in job stream', {
      error,
      tags: { operation: 'stream_setup' },
    })
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}

/**
 * Helper function to format Server-Sent Events (SSE) messages
 * @param event - Event name
 * @param data - Data payload
 * @returns Encoded SSE string
 */
function encodeSSE(event: string, data: string): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${data}\n\n`)
}
