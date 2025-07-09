import { getHiResPhotoBlob } from '@/components/server'
import { getBotToken } from '@/lib/server/constants'

import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log(`setting up notification stream for job updates`)
  try {
    const searchParams = request.nextUrl.searchParams
    const session = searchParams.get('session')

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Please specify a session to use' }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const accessHash = searchParams.get('access')
    const { id } = await params
    const result = await getHiResPhotoBlob(session, id, accessHash ?? undefined)

    if (result.ok) {
      return new Response(result.ok, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Type': 'image/jpeg',

          // this is a new-ish header that tells the cache to ignore query params - this is what
          // we want since the images are uniquely identified by id
          'No-Vary-Search': 'params',
        },
        status: 200,
      })
    } else {
      console.error(result.error)
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      })
    }
  } catch (error) {
    console.error('Server error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}
