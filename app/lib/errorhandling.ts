
// these function serves to move erorrs over the wire for server side functions
// why?: we generally want to transmit exceptions generated on the server to the client to display in UI

import { Result } from "@ucanto/client"
import { Api } from "@/vendor/telegram"

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

const serializeErrorObject = (err: Error) : ErrorObjectError => {
  const { message, cause} = err
  return {
    kind: 'errorObject',
    message,
    cause: cause instanceof Error ? serializeErrorObject(cause) : undefined    
  }
}

const deserializeErrorObject = (err: ErrorObjectError) : Error => {
  return new Error(err.message, { cause: err.cause ? deserializeErrorObject(err.cause) : undefined })
}

export type PromiseFn<T extends [unknown, ...unknown[]], U> = (...args:T) => Promise<U>
export const toResultFn = <T extends [unknown, ...unknown[]], U>(fn: PromiseFn<T, U>): ((...args: T) => Promise<Result<U, SerializedError>>) => 
  async (...r: T) : Promise<Result<U, SerializedError>> => {
    try {
      const response = await fn(...r)
      return { ok: response }
    } catch (err) {
      if (err instanceof Api.RpcError) {
        console.error("telegram error", err.errorCode, err.errorMessage)
        return {
          error: { kind: 'telegram', errorMessage: err.errorMessage, errorCode: err.errorCode}
        }
      }
      if (err instanceof Error) {
        console.error(err.message, err.stack)
        return { error: serializeErrorObject(err) }
      }
      if (typeof err == 'string') {
        console.error(err)
        return {
          error: { kind: 'string', value: err }
        }
      }
      // don't know what to do with these errors, so just rethrow
      throw err
    }
  }

export const parseResult = <T>(result: Result<T, SerializedError>) : Result<T, string> => { 
  if (result.error) {
    const err = result.error
    switch (err.kind) {
      case 'telegram':
        return { error: err.errorMessage }
      case 'string':
        return { error: err.value }
      case 'errorObject':
        return { error: err.message }
    }
  }
  return { ok: result.ok }
}

export const fromResult = <T>(result: Result<T, SerializedError>) : T => { 
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