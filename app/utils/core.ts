import {
  backButton,
  viewport,
  themeParams,
  miniApp,
  initData,
  $debug,
  init as initSDK,
} from '@telegram-apps/sdk-react'

export function init(debug: boolean): void {
  $debug.set(debug)

  initSDK()

  if (backButton.isSupported()) {
    backButton.mount()
  }

  miniApp.mount()
  themeParams.mount()
  initData.restore()

  void viewport.mount().catch((e) => {
    console.error('Something went wrong mounting the viewport', e)
  })

  if (debug) {
    import('eruda').then((lib) => lib.default.init()).catch(console.error)
  }
}
