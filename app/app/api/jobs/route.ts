import { ExecuteJobRequest } from '@/api'
import { getDB } from '@/lib/server/db'
import { getTelegramId, handleJob } from '@/lib/server/jobs'
import { getSession } from '@/lib/server/session'
import { parseWithUIntArrays, stringifyWithUIntArrays } from '@/lib/utils'
import { gracefulShutdown } from '@/lib/server/graceful-shutdown'
import { createLogger } from '@/lib/server/logger'
import { addBreadcrumb } from '@sentry/nextjs'

export const dynamic = 'force-dynamic'

// Create logger for jobs API route
const logger = createLogger({ route: 'api/jobs' })

function isJobAuthed(request: Request) {
  if (process.env.BACKUP_PASSWORD) {
    const header = request.headers.get('authorization')
    if (!header) return false

    const encodedCreds = header.split(' ')[1]
    if (!encodedCreds) return false
    const [username, ...passwordparts] = Buffer.from(encodedCreds, 'base64')
      .toString()
      .split(':')
    const password = passwordparts.join(':')
    return username === 'user' && password === process.env.BACKUP_PASSWORD
  } else {
    logger.warn(
      'No auth password set for handling jobs, assuming authentication'
    )
    return true
  }
}

export async function POST(request: Request) {
  addBreadcrumb({
    message: 'Job POST request received',
    level: 'info',
  })

  if (gracefulShutdown.isShutdownInitiated()) {
    addBreadcrumb({
      message: 'Service unavailable - graceful shutdown in progress',
      level: 'warning',
    })
    return new Response('Service temporarily unavailable', {
      status: 503,
      headers: {
        'Retry-After': '30', // Tell clients to retry after 30 seconds (By default, there is a 30 second delay between the delivery of SIGTERM and SIGKILL signals)
      },
    })
  }

  logger.info('Handling job batch...')
  if (!isJobAuthed(request)) {
    addBreadcrumb({
      message: 'Job authentication failed',
      level: 'error',
    })
    logger.error('Job authentication failed', {
      error: 'Unauthorized access attempt',
    })
    return new Response('Unauthorized', { status: 401 })
  }

  addBreadcrumb({
    message: 'Job authentication successful',
    level: 'info',
  })

  const message = await request.json()

  addBreadcrumb({
    message: 'Job message parsed, starting execution',
    level: 'info',
  })

  handleJob(parseWithUIntArrays(message.body) as ExecuteJobRequest)
  return Response.json({}, { status: 202 })
}

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
      tags: { operation: 'subscribe_job_updates' },
    })
    let unsubscribe: () => void
    // Create a new ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encodeSSE('init', 'Connecting...'))
          unsubscribe = await db.subscribeToJobUpdates(
            dbUser.id,
            (action, job) => {
              logger.debug('Received job update', {
                action,
                jobId: job.id,
                userId: dbUser.id,
                tags: { operation: 'job_update' },
              })
              controller.enqueue(
                encodeSSE(action, stringifyWithUIntArrays(job))
              )
            }
          )
        } catch (error) {
          addBreadcrumb({
            message: 'SSE stream setup failed',
            level: 'error',
          })

          logger.error('Stream setup error', {
            error: error as Error,
            tags: { operation: 'stream_setup' },
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
      error: error as Error,
      tags: { operation: 'main_handler' },
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
