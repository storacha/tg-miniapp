// these function serves to move erorrs over the wire for server side functions
// why?: we generally want to transmit exceptions generated on the server to the client to display in UI

import { Result } from '@ucanto/client'
import { Api } from '@/vendor/telegram'

type SerializedError = TelegramError | StringError | ErrorObjectError

interface TelegramError {
  kind: 'telegram'
  errorMessage: string
  errorCode: number
}

interface StringError {
  kind: 'string'
  value: string
}

interface ErrorObjectError {
  kind: 'errorObject'
  message: string
  cause?: ErrorObjectError
}

const serializeErrorObject = (err: Error): ErrorObjectError => {
  const { message, cause } = err
  return {
    kind: 'errorObject',
    message,
    cause: cause instanceof Error ? serializeErrorObject(cause) : undefined,
  }
}

const deserializeErrorObject = (err: ErrorObjectError): Error => {
  return new Error(err.message, {
    cause: err.cause ? deserializeErrorObject(err.cause) : undefined,
  })
}

export type PromiseFn<T extends [unknown, ...unknown[]], U> = (
  ...args: T
) => Promise<U>
export const toResultFn =
  <T extends [unknown, ...unknown[]], U>(
    fn: PromiseFn<T, U>
  ): ((...args: T) => Promise<Result<U, SerializedError>>) =>
  async (...r: T): Promise<Result<U, SerializedError>> => {
    try {
      const response = await fn(...r)
      return { ok: response }
    } catch (err) {
      if (err instanceof Api.RpcError) {
        console.error('telegram error', err.errorCode, err.errorMessage)
        return {
          error: {
            kind: 'telegram',
            errorMessage: err.errorMessage,
            errorCode: err.errorCode,
          },
        }
      }
      if (err instanceof Error) {
        console.error(err.message, err.stack)
        return { error: serializeErrorObject(err) }
      }
      if (typeof err == 'string') {
        console.error(err)
        return {
          error: { kind: 'string', value: err },
        }
      }
      // don't know what to do with these errors, so just rethrow
      throw err
    }
  }

export const fromResult = <T>(result: Result<T, SerializedError>): T => {
  if (result.error) {
    const err = result.error
    switch (err.kind) {
      case 'telegram':
        throw new Api.RpcError(err)
      case 'string':
        throw err.value
      case 'errorObject':
        throw deserializeErrorObject(err)
    }
  }
  return result.ok
}

export const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) {
    return err.message
  }

  if (typeof err === 'string') {
    return err
  }

  if (err instanceof Api.RpcError) {
    return `${err.errorCode}: ${err.errorMessage}`
  }

  if (typeof err === 'object' && err !== null) {
    // @ts-expect-error if message or errorMessage does not exist, 'Unknown error' will be returned
    const msg = err.message ?? err.errorMessage
    if (typeof msg === 'string') return msg
  }

  return 'Unknown error'
}

export const toUserFriendlyError = (err: unknown): string => {
  const text = getErrorMessage(err)

  if (text.includes('CONNECTION_NOT_INITED')) {
    return `You hit a Telegram limit!
This happens when Telegram asks you to wait before downloading files from their servers. Don’t worry, it’s not a problem with the app, it’s just how the Telegram API works for your account.
Please wait about 1 hour before starting a new backup.`
  }
  if (text.includes('AUTH_KEY_UNREGISTERED')) {
    return 'Your Telegram session has expired. Please log out and log in again.'
  }
  if (text.includes('NETWORK_MIGRATE')) {
    return 'Telegram network issue. Please try again later.'
  }
  if (text) {
    return text
  }

  return 'An unexpected error occurred. Please try again.'
}
