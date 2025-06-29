import { NextRequest } from 'next/server'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const fileRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${id}`
    )
    const fileJson = await fileRes.json()

    if (!fileJson.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch file info' }),
        {
          status: 500,
        }
      )
    }

    const filePath = fileJson.result.file_path
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`

    return Response.json({ fileUrl })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
    })
  }
}
