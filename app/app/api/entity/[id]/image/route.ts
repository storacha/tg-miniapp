import bigInt from 'big-integer'
import { Api, TelegramClient } from 'telegram'
import { NextRequest } from 'next/server'

import { Result } from '@ucanto/client'
import { getTelegramClient } from '@/lib/server/telegram-manager'

async function tryHardToFetchEntity(
  client: TelegramClient,
  id: string,
  accessHash?: string
) {
  try {
    return await client.getEntity(id)
  } catch {
    // there seem to be a few user entities that don't load properly using the code above
    // but do load if we construct the Peer manually, so do that as a fallback
    return new Api.InputPeerUser({
      userId: bigInt(id),
      accessHash: accessHash ? bigInt(accessHash) : bigInt(0),
    })
  }
}

async function getHiResPhotoBlob(
  sessionString: string,
  id: string,
  accessHash?: string
): Promise<Result<string | Buffer | undefined>> {
  let client: TelegramClient | undefined = undefined
  try {
    client = await getTelegramClient(sessionString)
    const entity = await tryHardToFetchEntity(client, id, accessHash)
    return { ok: await client.downloadProfilePhoto(entity) }
  } catch (e) {
    // @ts-expect-error e has no type, ignore
    const message = e.message
    return { error: { message } }
  } finally {
    if (client) {
      await client.disconnect()
    }
  }
}

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
