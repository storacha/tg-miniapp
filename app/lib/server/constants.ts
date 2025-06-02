import * as DID from '@ipld/dag-ucan/did'
import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import { ed25519 } from '@ucanto/principal'
import type { Service } from '@storacha/client/types'

let cachedServerConstants: {
  SERVER_IDENTITY_PRIVATE_KEY: string
  TELEGRAM_BOT_TOKEN: string
  SESSION_PASSWORD: string
  SESSION_COOKIE_NAME: string
}

export const getServerConstants = () => {
  if (cachedServerConstants) {
    return cachedServerConstants
  }
  if (!process.env.SERVER_IDENTITY_PRIVATE_KEY)
    throw new Error('SERVER_IDENTITY_PRIVATE_KEY must be set')
  const SERVER_IDENTITY_PRIVATE_KEY = process.env.SERVER_IDENTITY_PRIVATE_KEY

  if (!process.env.TELEGRAM_BOT_TOKEN)
    throw new Error('TELEGRAM_BOT_TOKEN must be set')
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

  if (!process.env.SESSION_PASSWORD)
    throw new Error('SESSION_PASSWORD must be set')
  const SESSION_PASSWORD = process.env.SESSION_PASSWORD

  const DEFAULT_COOKIE_VALUE = 'tg-backups'
  const SESSION_COOKIE_NAME =
    process.env.SESSION_COOKIE_NAME || DEFAULT_COOKIE_VALUE
  if (!process.env.SESSION_COOKIE_NAME) {
    console.warn(
      `SESSION_COOKIE_NAME is not set - using default value of ${DEFAULT_COOKIE_VALUE}`
    )
  }
  cachedServerConstants = {
    SERVER_IDENTITY_PRIVATE_KEY,
    TELEGRAM_BOT_TOKEN,
    SESSION_COOKIE_NAME,
    SESSION_PASSWORD
  }
  return cachedServerConstants
}

let cachedServerIdentity: ed25519.Signer.Signer

type DidWeb = `did:web:${string}`
type DidKey = `did:key:${string}`
function isDidWeb(s?: string): s is DidWeb {
  return Boolean(s && s.startsWith('did:web'))
}
function isDidKey(s?: string): s is DidKey {
  return Boolean(s && s.startsWith('did:key'))
}

if (
  !(
    isDidWeb(process.env.NEXT_PUBLIC_SERVER_DID) ||
    isDidKey(process.env.NEXT_PUBLIC_SERVER_DID)
  )
)
  throw new Error('NEXT_PUBLIC_SERVER_DID must be set')
export const SERVER_DID = process.env.NEXT_PUBLIC_SERVER_DID

export const getServerIdentity = () => {
  if (cachedServerIdentity) {
    return cachedServerIdentity
  }
  const envConstants = getServerConstants()
  cachedServerIdentity = ed25519.Signer.parse(
    envConstants.SERVER_IDENTITY_PRIVATE_KEY
  ).withDID(SERVER_DID)
  return cachedServerIdentity
}

let cachedBotToken: string
export const getBotToken = () => {
  if (cachedBotToken) {
    return cachedBotToken
  }
  const envConstants = getServerConstants()
  cachedBotToken = envConstants.TELEGRAM_BOT_TOKEN
  return cachedBotToken
}

const die = (name: string) => {
  throw new Error(`Environment variable ${name} is required and not set.`)
}

const serviceURL = new URL(
  process.env.NEXT_PUBLIC_STORACHA_SERVICE_URL ??
    die('NEXT_PUBLIC_STORACHA_SERVICE_URL')
)

export const servicePrincipal = DID.parse(
  process.env.NEXT_PUBLIC_STORACHA_SERVICE_DID ??
    die('NEXT_PUBLIC_STORACHA_SERVICE_DID')
)

export const receiptsEndpoint = new URL(
  process.env.NEXT_PUBLIC_STORACHA_RECEIPTS_URL ??
    die('NEXT_PUBLIC_STORACHA_RECEIPTS_URL')
)

const version = process.env.NEXT_PUBLIC_VERSION ?? '1.0.0'

export const serviceConnection = connect<Service>({
  id: servicePrincipal,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: serviceURL,
    method: 'POST',
    headers: {
      'X-Client': `Storacha/1 (js; browser) TelegramMiniapp/${version.split('.')[0]}`,
    },
  }),
})

export const telegramAPIID = parseInt(process.env.NEXT_PUBLIC_TELEGRAM_API_ID ?? die('NEXT_PUBLIC_TELEGRAM_API_ID'))
export const telegramAPIHash = process.env.NEXT_PUBLIC_TELEGRAM_API_HASH ?? die('NEXT_PUBLIC_TELEGRAM_API_HASH')

export const mRachaPointsPerByte = parseFloat(process.env.NEXT_PUBLIC_POINTS_PER_BYTE ?? die('NEXT_PUBLIC_POINTS_PER_BYTE'))