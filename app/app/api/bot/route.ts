import { NextRequest, NextResponse } from 'next/server'

const appUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://telegram.storacha.network'
    : process.env.LOCAL_URL

export async function POST(req: NextRequest) {
  const body = await req.json()

  const message = body?.message
  const chatId = message?.chat?.id
  const text = message?.text

  if (text === '/start' && chatId) {
    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: 'Welcome to Secure Chats Backup!\nClick the button below to start backing up your chats.',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Open',
                web_app: {
                  url: appUrl,
                },
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }),
    })

    if (!response.ok) {
      console.error('Failed to send message:', response.statusText)
      return NextResponse.json({ ok: false, error: 'Failed to send message' })
    }
  }

  return NextResponse.json({ ok: true })
}
