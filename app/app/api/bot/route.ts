import { createLogger } from '@/lib/server/logger'
import { NextRequest, NextResponse } from 'next/server'
import TelegramBot, {
  InlineKeyboardMarkup,
  InlineQueryResult,
} from 'node-telegram-bot-api'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const BOT_NAME = process.env.TELEGRAM_BOT_NAME || 'storacha_bot'
const SUPPORT_URL = process.env.SUPPORT_URL || 'https://t.me/storachanetwork'
const WEB_APP_URL = process.env.LOCAL_URL || 'https://telegram.storacha.network'
const INLINE_URL = `t.me/${BOT_NAME}?startapp`
const THUMB_URL = `${WEB_APP_URL}/storacha-round-logo.png`

const WELCOME_MESSAGE = `🚨 *Don't Lose Your Telegram Chats*

⚠️ *What You Risk:*
• **Phone stolen/broken** → All Telegram chats gone
• **Device hacked** → Your messages exposed
• **Accidental deletion** → Conversations lost forever

🛡️ *Storacha Solution:*
✅ **YOUR private key** - We can't read your data
✅ **Decentralized storage** - Can't be deleted
✅ **Earn loyalty points** - Build up rewards

*Don't wait until it's too late.*`

const getInlineKeyboard = (inline = false): InlineKeyboardMarkup => ({
  inline_keyboard: [
    [
      {
        text: '🛡️ BACKUP MY TELEGRAM CHATS',
        ...(inline
          ? { url: `${INLINE_URL}` }
          : { web_app: { url: WEB_APP_URL } }),
      },
    ],
    [
      {
        text: '📤 Share with your friends',
        switch_inline_query: '',
      },
    ],
    [
      {
        text: '💬 Ask Storacha for help',
        url: SUPPORT_URL,
      },
    ],
  ],
})

// Initialize bot with webhook mode
const bot = new TelegramBot(BOT_TOKEN, { webHook: { port: 443 } })
const logger = createLogger({ service: 'telegram-bot' })

// Set up event listeners once
let listenersSetup = false

const setupBotListeners = () => {
  if (listenersSetup) return

  // Handle /start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id
    const userId = msg.from?.id

    const messageLogger = logger.child({
      chatId,
      userId,
      command: 'start',
    })

    try {
      await bot.sendMessage(chatId, WELCOME_MESSAGE, {
        parse_mode: 'Markdown',
        reply_markup: getInlineKeyboard(),
      })
    } catch (error) {
      messageLogger.error('Error sending start message', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  // Handle inline queries
  bot.on('inline_query', async (query) => {
    const queryLogger = logger.child({
      inlineQueryId: query.id,
      query: query.query || '',
      userId: query.from?.id,
    })

    const results: InlineQueryResult[] = [
      {
        type: 'article',
        id: `telegram-backup-${Date.now()}`,
        title: "🚨 Don't Lose Your Telegram Chats",
        description:
          'Backup your Telegram chats • Phone stolen • Device hacked • Never lose chats',
        thumb_url: THUMB_URL,
        input_message_content: {
          message_text: WELCOME_MESSAGE,
          parse_mode: 'Markdown',
        },
        reply_markup: getInlineKeyboard(true),
      },
    ]

    try {
      await bot.answerInlineQuery(query.id, results, {
        cache_time: 0,
        is_personal: false,
      })
    } catch (error) {
      queryLogger.error('Error answering inline query', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  // Handle callback queries
  bot.on('callback_query', async (callbackQuery) => {
    const callbackLogger = logger.child({
      callbackQueryId: callbackQuery.id,
      data: callbackQuery.data,
      userId: callbackQuery.from?.id,
    })

    try {
      await bot.answerCallbackQuery(callbackQuery.id)
    } catch (error) {
      callbackLogger.error('Error answering callback query', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  // Error handling
  bot.on('error', (error) => {
    logger.error('Bot error', {
      error: error.message,
    })
  })

  listenersSetup = true
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Telegram Bot is active',
    webApp: WEB_APP_URL,
  })
}

export async function POST(req: NextRequest) {
  try {
    // Set up listeners on first request
    setupBotListeners()

    const body = await req.json()

    logger.info('Received webhook', {
      updateType: body.message
        ? 'message'
        : body.inline_query
          ? 'inline_query'
          : body.callback_query
            ? 'callback_query'
            : 'unknown',
      chatId: body.message?.chat?.id,
      userId:
        body.message?.from?.id ||
        body.inline_query?.from?.id ||
        body.callback_query?.from?.id,
    })

    // Let the bot handle the update - this triggers the event listeners
    bot.processUpdate(body)

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('Webhook processing error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
