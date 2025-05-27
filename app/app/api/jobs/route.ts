import { ExecuteJobRequest } from '@/api'
import { create as createJobServer } from '@/lib/server/server'
import { parseWithUIntArrays } from '@/lib/utils'

function isJobAuthed(request: Request) {
  const header = request.headers.get('authorization')
  if (!header) return false

  const encodedCreds = header.split(' ')[1]
  if (!encodedCreds) return false
  const [username, password] = Buffer.from(encodedCreds, 'base64')
    .toString()
    .split(':')
  return username === 'user' && password === process.env.BACKUP_PASSWORD
}

export async function POST(request: Request) {
  console.log(`Handling job batch...`)
  if (!isJobAuthed(request)) {
    console.error(`Job auth not found.`)
    return new Response('Unauthorized', { status: 401 })
  }
  
  const message = await request.json()
  
  const server = await createJobServer({
    // don't need queue function just to call handle job
    queueFn: async () => {}
  })
  await server.handleJob(parseWithUIntArrays(message.body) as ExecuteJobRequest)
  return Response.json({})
}
