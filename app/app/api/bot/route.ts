import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const message = body?.message
  const chatId = message?.chat?.id
  const text = message?.text

  if (text === '/start' && chatId) {
    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`

    await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: 'Welcome! Tap the button below to open the app.',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Launch',
                web_app: {
                  url: process.env.LOCAL_URL,
                },
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }),
    })
  }

  return NextResponse.json({ ok: true })
}
