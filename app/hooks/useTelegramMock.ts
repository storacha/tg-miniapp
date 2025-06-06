import { useClientOnce } from './useClientOnce'
import {
  isTMA,
  type LaunchParams,
  mockTelegramEnv,
  parseInitData,
  retrieveLaunchParams,
} from '@telegram-apps/sdk-react'

export function useTelegramMock(): void {
  useClientOnce(() => {
    if (!sessionStorage.getItem('env-mocked') && isTMA('simple')) {
      return
    }

    let lp: LaunchParams | undefined
    try {
      lp = retrieveLaunchParams()
    } catch (e: unknown) {
      const initDataRaw = new URLSearchParams([
        [
          'user',
          JSON.stringify({
            id: 99281932,
            first_name: 'Andrew',
            last_name: 'Rogue',
            username: 'rogue',
            language_code: 'en',
            is_premium: true,
            allows_write_to_pm: true,
          }),
        ],
        [
          'hash',
          '89d6079ad6762351f38c6dbbc41bb53048019256a9443988af7a48bcad16ba31',
        ],
        ['auth_date', '1716922846'],
        ['start_param', 'debug'],
        ['chat_type', 'sender'],
        ['chat_instance', '8428209589180549439'],
      ]).toString()

      // console.log('initDataRaw', parseInitData(initDataRaw))

      lp = {
        themeParams: {},
        initData: parseInitData(initDataRaw),
        initDataRaw,
        version: '8',
        platform: 'tdesktop',
      }
    }

    sessionStorage.setItem('env-mocked', '1')
    mockTelegramEnv(lp)
    console.warn(
      '⚠️ As long as the current environment was not considered as the Telegram-based one, it was mocked. Take a note, that you should not do it in production and current behavior is only specific to the development process. Environment mocking is also applied only in development mode. So, after building the application, you will not see this behavior and related warning, leading to crashing the application outside Telegram.'
    )
  })
}
