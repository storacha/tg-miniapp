import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import {
  telegramAPIID,
  telegramAPIHash,
  defaultClientParams,
} from '@/lib/server/constants'
import { LogLevel } from 'telegram/extensions/Logger'

/**
 * Override console.error globally to handle TIMEOUT errors from Telegram client
 * This is a workaround for the issue where Telegram client logs TIMEOUT errors
 * directly via console.error bypassing the library's logger system
 */
const _origConsoleError = console.error

// attach a guard to globalThis so we don't override multiple times
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!(globalThis as any).__telegram_console_error_overridden) {
  console.error = (...args: unknown[]) => {
    const err = args[0]
    const isTelegramTimeout =
      err instanceof Error &&
      err.message === 'TIMEOUT' &&
      typeof err.stack === 'string' &&
      err.stack.includes('telegram')
    if (isTelegramTimeout) {
      // console.debug(String(err)) // Commented out to reduce log noise
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _origConsoleError.apply(console, args as any)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).__telegram_console_error_overridden = true
}

export const getTelegramClient = async (
  session: string
): Promise<TelegramClient> => {
  const sessionString = new StringSession(session)
  // DC ip servers need to be set to IP addresses on node
  // see https://github.com/gram-js/gramjs/issues/344#issuecomment-1405518285
  // and further discussion in @gramjschat on Telegram
  const dcServers: Record<number, string> = {
    1: '149.154.175.54',
    2: '149.154.167.50',
    3: '149.154.175.100',
    4: '149.154.167.91',
    5: '91.108.56.103',
  }

  sessionString.setDC(
    sessionString.dcId,
    dcServers[sessionString.dcId],
    sessionString.port
  )
  const telegramClient = new TelegramClient(
    // @ts-expect-error type 'StringSession' is not assignable to parameter of type 'string | Session'
    sessionString,
    telegramAPIID,
    telegramAPIHash,
    defaultClientParams
  )

  telegramClient.setLogLevel(LogLevel.ERROR)

  if (!(await telegramClient.connect())) {
    throw new Error('failed to connect to telegram')
  }
  if (!(await telegramClient.checkAuthorization())) {
    throw new Error('client authorization failed')
  }

  return telegramClient
}
