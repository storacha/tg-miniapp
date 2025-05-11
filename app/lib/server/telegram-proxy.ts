'use server'
import { WithInitData, SendCodeRequest, SendCodeResponse, TelegramError, TelegramAuth, CheckPasswordRequest, SignInResponse, SignInRequest, WithTelegramAuth } from "@/api"
import { Result } from "@ucanto/client"
import * as Setup from "./setup";
import { Api } from "telegram";
import bigInt from "big-integer";
import { TelegramClient } from "@/vendor/telegram";

const toResultFn = <Request, Response>(fn: (r: Request) => Promise<Response>) : ((r: Request) => Promise<Result<Response, TelegramError>>) => 
  async (r: Request) : Promise<Result<Response, TelegramError>> => {
    try {
      const response = await fn(r)
      return { ok: response }
    } catch (err) {
      if (err instanceof Api.RpcError) {
        return {
          error: err
        }
      }
      if (err instanceof Error) {
        return {
          error: {
            errorCode: -1,
            errorMessage: err.message
          }
        }
      }
      // don't know what to do with this errorx
      throw err
    }
  }

export const sendCode = toResultFn(async (request: WithInitData<SendCodeRequest>) : Promise<SendCodeResponse> => {
  const client = await Setup.initializeTelegram({initData: request.initData, session: ''})
  return client.sendCode(client, request.phoneNumber)
})

export const getPassword = toResultFn(async (request: WithInitData<{}>) : Promise<ReturnType<typeof Api.account.Password.prototype.toJSON>> => {
  const client = await Setup.initializeTelegram({initData: request.initData, session: ''})
  return (await client.invoke(new Api.account.GetPassword())).toJSON()
})

export const checkPassword = toResultFn(async (request: WithInitData<CheckPasswordRequest>) : Promise<SignInResponse> => {
  const client = await Setup.initializeTelegram({initData: request.initData, session: ''})
  const result = await client.invoke(new Api.auth.CheckPassword({password: new Api.InputCheckPasswordSRP({
      srpId: bigInt(request.password.srpId),
      A: Buffer.from(request.password.A),
      M1: Buffer.from(request.password.M1)
  })}))
  if (result instanceof Api.auth.AuthorizationSignUpRequired) {
    throw new Error('user needs to sign up')
  }
  const userID = await Setup.checkTelegramAuthorization(request.initData, client)
  const session = Setup.saveSessionToString(client.session)
  return { userID, session }
})

export const signIn = toResultFn(async (request: WithInitData<SignInRequest>) : Promise<SignInResponse> => {
  const client = await Setup.initializeTelegram({initData: request.initData, session: ''})  
  const result = await client.invoke(
    new Api.auth.SignIn(request),
  )
  if (result instanceof Api.auth.AuthorizationSignUpRequired) {
    throw new Error('user needs to sign up')
  }
  const userID = await Setup.checkTelegramAuthorization(request.initData, client)
  const session = Setup.saveSessionToString(client.session)
  return { userID, session }
})

export const getMe = toResultFn(async (request: WithTelegramAuth<{}>) => {
  const client = await Setup.initializeAuthorizedTelegram(request.telegramAuth)
  const result = await client.getMe()
  return { id: result.id.toString() }
})

export const getDialogs = toResultFn(async (request: WithTelegramAuth<ReturnType<typeof Api.messages.GetDialogs.prototype.toJSON>>) : Promise<
  ReturnType<typeof Api.messages.Dialogs.prototype.toJSON> | 
  ReturnType<typeof Api.messages.DialogsSlice.prototype.toJSON> |
  ReturnType<typeof Api.messages.DialogsNotModified.prototype.toJSON>
> => {
  const client = await Setup.initializeAuthorizedTelegram(request.telegramAuth)
  return (await client.invoke(new Api.messages.GetDialogs(request))).toJSON()
})