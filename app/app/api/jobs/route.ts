import { ExecuteJobRequest } from '@/api'
import { getDB } from '@/lib/server/db'
import { getTelegramId, handleJob } from '@/lib/server/jobs'
import { getSession } from '@/lib/server/session'
import { parseWithUIntArrays, stringifyWithUIntArrays } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function isJobAuthed(request: Request) {
  if (process.env.BACKUP_PASSWORD) {
    const header = request.headers.get('authorization')
    if (!header) return false

    const encodedCreds = header.split(' ')[1]
    if (!encodedCreds) return false
    const [username, password] = Buffer.from(encodedCreds, 'base64')
      .toString()
      .split(':')
    return username === 'user' && password === process.env.BACKUP_PASSWORD
  } else {
    console.warn(
      'no auth password set for handling jobs, assuming authentication'
    )
    return true
  }
}

export async function POST(request: Request) {
  console.log(`Handling job batch...`)
  if (!isJobAuthed(request)) {
    console.error(`Job auth not found.`)
    return new Response('Unauthorized', { status: 401 })
  }

  const message = await request.json()

  handleJob(parseWithUIntArrays(message.body) as ExecuteJobRequest)
  return Response.json({}, { status: 202 })
}

export async function GET() {
  console.log(`setting up notification stream for job updates`)
  try {
    const session = await getSession()
    const db = getDB()
    const telegramId = getTelegramId(session.telegramAuth)
    const dbUser = await db.findOrCreateUser({
      storachaSpace: session.spaceDID,
      storachaAccount: session.accountDID,
      telegramId: telegramId.toString(),
    })
    console.log('subscribing updates for user', dbUser.id)
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
              console.debug('received job update', action, job.id)
              controller.enqueue(
                encodeSSE(action, stringifyWithUIntArrays(job))
              )
            }
          )
        } catch (error) {
          console.error('Stream error:', error)
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
    console.error('Server error:', error)
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
