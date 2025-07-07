import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { TelegramClientParams } from 'telegram/client/telegramBaseClient'
import { telegramAPIID, telegramAPIHash } from '@/lib/server/constants'

const defaultClientParams: TelegramClientParams = { connectionRetries: 5 }

export const getTelegramClient = async (
  session: string
): Promise<TelegramClient> => {
  console.log('getTelegramClient with: ', session)
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
    sessionString,
    telegramAPIID,
    telegramAPIHash,
    defaultClientParams
  )

  /**
   * Override console.error only during Telegram operations
   * Skip errors related to TIMEOUT
   * This is a workaround for the issue where Telegram client throws TIMEOUT errors an logs them without using the logger
   */
  const originalError = console.error
  // eslint-disable-next-line
  console.error = (...args: any[]) => {
    const message = args[0]
    if (
      (typeof message === 'string' && message.includes('TIMEOUT')) ||
      (message instanceof Error && message.message === 'TIMEOUT')
    ) {
      return
    }
    originalError.apply(console, args)
  }

  const originalDisconnect = telegramClient.disconnect.bind(telegramClient)
  telegramClient.disconnect = async () => {
    console.error = originalError
    return originalDisconnect()
  }

  if (!(await telegramClient.connect())) {
    throw new Error('failed to connect to telegram')
  }
  if (!(await telegramClient.checkAuthorization())) {
    throw new Error('client authorization failed')
  }

  return telegramClient
}
