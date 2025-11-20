import * as DID from '@ipld/dag-ucan/did'
import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import { ed25519 } from '@ucanto/principal'
import type { Service } from '@storacha/client/types'
import { TelegramClientParams } from 'telegram/client/telegramBaseClient'
import { createLogger } from './logger'

let cachedServerConstants: {
  SERVER_IDENTITY_PRIVATE_KEY: string
  TELEGRAM_BOT_TOKEN: string
  SESSION_PASSWORD: string
  SESSION_COOKIE_NAME: string
}

const logger = createLogger({ service: 'server-constants' })

// Environment validation summary
interface EnvValidationSummary {
  isValid: boolean
  errors: string[]
  warnings: string[]
  validatedVariables: string[]
}

// Environment variable validation utilities
interface EnvValidationResult {
  isValid: boolean
  value: string
  error?: string
}

const validateRequiredEnv = (name: string, value: string | undefined): EnvValidationResult => {
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      value: '',
      error: `Environment variable ${name} is required but not set or empty`
    }
  }
  return {
    isValid: true,
    value: value.trim()
  }
}

const validateOptionalEnv = (name: string, value: string | undefined, defaultValue: string): EnvValidationResult => {
  if (!value || value.trim() === '') {
    logger.warn(`Environment variable ${name} is not set - using default value`, { 
      defaultValue,
      variable: name 
    })
    return {
      isValid: true,
      value: defaultValue
    }
  }
  return {
    isValid: true,
    value: value.trim()
  }
}

const validateNumericEnv = (name: string, value: string | undefined): EnvValidationResult => {
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      value: '',
      error: `Environment variable ${name} is required but not set`
    }
  }
  
  const numericValue = parseFloat(value.trim())
  if (isNaN(numericValue)) {
    return {
      isValid: false,
      value: value.trim(),
      error: `Environment variable ${name} must be a valid number, got: ${value}`
    }
  }
  
  return {
    isValid: true,
    value: value.trim()
  }
}

const validateUrlEnv = (name: string, value: string | undefined): EnvValidationResult => {
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      value: '',
      error: `Environment variable ${name} is required but not set`
    }
  }
  
  try {
    new URL(value.trim())
    return {
      isValid: true,
      value: value.trim()
    }
  } catch (error) {
    return {
      isValid: false,
      value: value.trim(),
      error: `Environment variable ${name} must be a valid URL, got: ${value}`
    }
  }
}

const validateDidEnv = (name: string, value: string | undefined): EnvValidationResult => {
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      value: '',
      error: `Environment variable ${name} is required but not set`
    }
  }
  
  const trimmedValue = value.trim()
  if (!trimmedValue.startsWith('did:web:') && !trimmedValue.startsWith('did:key:')) {
    return {
      isValid: false,
      value: trimmedValue,
      error: `Environment variable ${name} must be a valid DID (did:web: or did:key:), got: ${trimmedValue}`
    }
  }
  
  return {
    isValid: true,
    value: trimmedValue
  }
}

export const getServerConstants = () => {
  if (cachedServerConstants) {
    return cachedServerConstants
  }

  // Validate required environment variables
  const serverIdentityValidation = validateRequiredEnv('SERVER_IDENTITY_PRIVATE_KEY', process.env.SERVER_IDENTITY_PRIVATE_KEY)
  if (!serverIdentityValidation.isValid) {
    logger.error('Server identity validation failed', { error: serverIdentityValidation.error })
    throw new Error(serverIdentityValidation.error)
  }

  const botTokenValidation = validateRequiredEnv('TELEGRAM_BOT_TOKEN', process.env.TELEGRAM_BOT_TOKEN)
  if (!botTokenValidation.isValid) {
    logger.error('Telegram bot token validation failed', { error: botTokenValidation.error })
    throw new Error(botTokenValidation.error)
  }

  const sessionPasswordValidation = validateRequiredEnv('SESSION_PASSWORD', process.env.SESSION_PASSWORD)
  if (!sessionPasswordValidation.isValid) {
    logger.error('Session password validation failed', { error: sessionPasswordValidation.error })
    throw new Error(sessionPasswordValidation.error)
  }

  // Validate optional environment variables with defaults
  const DEFAULT_COOKIE_VALUE = 'tg-backups'
  const sessionCookieValidation = validateOptionalEnv('SESSION_COOKIE_NAME', process.env.SESSION_COOKIE_NAME, DEFAULT_COOKIE_VALUE)
  if (!sessionCookieValidation.isValid) {
    logger.error('Session cookie name validation failed', { error: sessionCookieValidation.error })
    throw new Error(sessionCookieValidation.error)
  }

  cachedServerConstants = {
    SERVER_IDENTITY_PRIVATE_KEY: serverIdentityValidation.value,
    TELEGRAM_BOT_TOKEN: botTokenValidation.value,
    SESSION_PASSWORD: sessionPasswordValidation.value,
    SESSION_COOKIE_NAME: sessionCookieValidation.value,
  }

  logger.info('Server constants initialized successfully', {
    hasServerIdentity: !!cachedServerConstants.SERVER_IDENTITY_PRIVATE_KEY,
    hasBotToken: !!cachedServerConstants.TELEGRAM_BOT_TOKEN,
    hasSessionPassword: !!cachedServerConstants.SESSION_PASSWORD,
    sessionCookieName: cachedServerConstants.SESSION_COOKIE_NAME
  })

  return cachedServerConstants
}

export const MAX_FREE_BYTES = 5 * 1024 * 1024 * 1024 // 5 GiB
export const MAX_BACKUP_WEEKS_PAID_TIER = 8
export const MAX_BACKUP_WEEKS_FREE_TIER = 2

let cachedServerIdentity: ed25519.Signer.Signer

type DidWeb = `did:web:${string}`
type DidKey = `did:key:${string}`

// Validate SERVER_DID with proper error handling
const serverDidValidation = validateDidEnv('NEXT_PUBLIC_SERVER_DID', process.env.NEXT_PUBLIC_SERVER_DID)
if (!serverDidValidation.isValid) {
  logger.error('Server DID validation failed', { error: serverDidValidation.error })
  throw new Error(serverDidValidation.error)
}
export const SERVER_DID = serverDidValidation.value

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

// Validate service URL
const serviceUrlValidation = validateUrlEnv('NEXT_PUBLIC_STORACHA_SERVICE_URL', process.env.NEXT_PUBLIC_STORACHA_SERVICE_URL)
if (!serviceUrlValidation.isValid) {
  logger.error('Service URL validation failed', { error: serviceUrlValidation.error })
  throw new Error(serviceUrlValidation.error)
}
const serviceURL = new URL(serviceUrlValidation.value)

// Validate service DID
const serviceDidValidation = validateDidEnv('NEXT_PUBLIC_STORACHA_SERVICE_DID', process.env.NEXT_PUBLIC_STORACHA_SERVICE_DID)
if (!serviceDidValidation.isValid) {
  logger.error('Service DID validation failed', { error: serviceDidValidation.error })
  throw new Error(serviceDidValidation.error)
}
export const servicePrincipal = DID.parse(serviceDidValidation.value)

// Validate receipts endpoint URL
const receiptsUrlValidation = validateUrlEnv('NEXT_PUBLIC_STORACHA_RECEIPTS_URL', process.env.NEXT_PUBLIC_STORACHA_RECEIPTS_URL)
if (!receiptsUrlValidation.isValid) {
  logger.error('Receipts URL validation failed', { error: receiptsUrlValidation.error })
  throw new Error(receiptsUrlValidation.error)
}
export const receiptsEndpoint = new URL(receiptsUrlValidation.value)

// Validate version with default
const versionValidation = validateOptionalEnv('NEXT_PUBLIC_VERSION', process.env.NEXT_PUBLIC_VERSION, '1.0.0')
if (!versionValidation.isValid) {
  logger.error('Version validation failed', { error: versionValidation.error })
  throw new Error(versionValidation.error)
}
const version = versionValidation.value

export const serviceConnection = connect<Service>({
  id: servicePrincipal,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: serviceURL,
    method: 'POST',
    headers: {
      'X-Client': `Storacha/1 (js; browser) TelegramMiniapp/${
        version.split('.')[0]
      }`,
    },
  }),
})

// Validate Telegram API ID
const telegramApiIdValidation = validateNumericEnv('NEXT_PUBLIC_TELEGRAM_API_ID', process.env.NEXT_PUBLIC_TELEGRAM_API_ID)
if (!telegramApiIdValidation.isValid) {
  logger.error('Telegram API ID validation failed', { error: telegramApiIdValidation.error })
  throw new Error(telegramApiIdValidation.error)
}
export const telegramAPIID = parseInt(telegramApiIdValidation.value)

// Validate Telegram API Hash
const telegramApiHashValidation = validateRequiredEnv('NEXT_PUBLIC_TELEGRAM_API_HASH', process.env.NEXT_PUBLIC_TELEGRAM_API_HASH)
if (!telegramApiHashValidation.isValid) {
  logger.error('Telegram API Hash validation failed', { error: telegramApiHashValidation.error })
  throw new Error(telegramApiHashValidation.error)
}
export const telegramAPIHash = telegramApiHashValidation.value

// Validate points per byte
const pointsPerByteValidation = validateNumericEnv('NEXT_PUBLIC_POINTS_PER_BYTE', process.env.NEXT_PUBLIC_POINTS_PER_BYTE)
if (!pointsPerByteValidation.isValid) {
  logger.error('Points per byte validation failed', { error: pointsPerByteValidation.error })
  throw new Error(pointsPerByteValidation.error)
}
export const mRachaPointsPerByte = parseFloat(pointsPerByteValidation.value)

// Validate app version with default
const appVersionValidation = validateOptionalEnv('version', process.env.version, '0.0.0')
if (!appVersionValidation.isValid) {
  logger.error('App version validation failed', { error: appVersionValidation.error })
  throw new Error(appVersionValidation.error)
}
const appVersion = appVersionValidation.value
export const defaultClientParams: TelegramClientParams = {
  connectionRetries: 5,
  deviceModel: 'Storacha',
  systemVersion: 'Linux',
  appVersion,
}

// Comprehensive environment validation function
export const validateAllEnvironmentVariables = (): EnvValidationSummary => {
  const errors: string[] = []
  const warnings: string[] = []
  const validatedVariables: string[] = []

  // Required environment variables
  const requiredVars = [
    'SERVER_IDENTITY_PRIVATE_KEY',
    'TELEGRAM_BOT_TOKEN', 
    'SESSION_PASSWORD',
    'NEXT_PUBLIC_SERVER_DID',
    'NEXT_PUBLIC_STORACHA_SERVICE_URL',
    'NEXT_PUBLIC_STORACHA_SERVICE_DID',
    'NEXT_PUBLIC_STORACHA_RECEIPTS_URL',
    'NEXT_PUBLIC_TELEGRAM_API_ID',
    'NEXT_PUBLIC_TELEGRAM_API_HASH',
    'NEXT_PUBLIC_POINTS_PER_BYTE'
  ]

  // Optional environment variables with defaults
  const optionalVars = [
    'SESSION_COOKIE_NAME',
    'NEXT_PUBLIC_VERSION',
    'version'
  ]

  // Validate required variables
  for (const varName of requiredVars) {
    const value = process.env[varName]
    if (!value || value.trim() === '') {
      errors.push(`Required environment variable ${varName} is not set or empty`)
    } else {
      validatedVariables.push(varName)
    }
  }

  // Validate optional variables
  for (const varName of optionalVars) {
    const value = process.env[varName]
    if (!value || value.trim() === '') {
      warnings.push(`Optional environment variable ${varName} is not set, using default value`)
    } else {
      validatedVariables.push(varName)
    }
  }

  // Special validations
  try {
    // Validate numeric values
    const telegramApiId = process.env.NEXT_PUBLIC_TELEGRAM_API_ID
    if (telegramApiId && isNaN(parseInt(telegramApiId))) {
      errors.push(`NEXT_PUBLIC_TELEGRAM_API_ID must be a valid number, got: ${telegramApiId}`)
    }

    const pointsPerByte = process.env.NEXT_PUBLIC_POINTS_PER_BYTE
    if (pointsPerByte && isNaN(parseFloat(pointsPerByte))) {
      errors.push(`NEXT_PUBLIC_POINTS_PER_BYTE must be a valid number, got: ${pointsPerByte}`)
    }

    // Validate URLs
    const serviceUrl = process.env.NEXT_PUBLIC_STORACHA_SERVICE_URL
    if (serviceUrl) {
      try {
        new URL(serviceUrl)
      } catch {
        errors.push(`NEXT_PUBLIC_STORACHA_SERVICE_URL must be a valid URL, got: ${serviceUrl}`)
      }
    }

    const receiptsUrl = process.env.NEXT_PUBLIC_STORACHA_RECEIPTS_URL
    if (receiptsUrl) {
      try {
        new URL(receiptsUrl)
      } catch {
        errors.push(`NEXT_PUBLIC_STORACHA_RECEIPTS_URL must be a valid URL, got: ${receiptsUrl}`)
      }
    }

    // Validate DIDs
    const serverDid = process.env.NEXT_PUBLIC_SERVER_DID
    if (serverDid && !serverDid.startsWith('did:web:') && !serverDid.startsWith('did:key:')) {
      errors.push(`NEXT_PUBLIC_SERVER_DID must be a valid DID (did:web: or did:key:), got: ${serverDid}`)
    }

    const serviceDid = process.env.NEXT_PUBLIC_STORACHA_SERVICE_DID
    if (serviceDid && !serviceDid.startsWith('did:web:') && !serviceDid.startsWith('did:key:')) {
      errors.push(`NEXT_PUBLIC_STORACHA_SERVICE_DID must be a valid DID (did:web: or did:key:), got: ${serviceDid}`)
    }

  } catch (error) {
    errors.push(`Error during special validation: ${error instanceof Error ? error.message : String(error)}`)
  }

  const isValid = errors.length === 0

  logger.info('Environment validation completed', {
    isValid,
    errorCount: errors.length,
    warningCount: warnings.length,
    validatedVariableCount: validatedVariables.length,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  })

  return {
    isValid,
    errors,
    warnings,
    validatedVariables
  }
}

// Export validation function for runtime checks
export const checkEnvironmentHealth = (): boolean => {
  try {
    const validation = validateAllEnvironmentVariables()
    return validation.isValid
  } catch (error) {
    logger.error('Environment health check failed', { 
      error: error instanceof Error ? error.message : String(error) 
    })
    return false
  }
}
