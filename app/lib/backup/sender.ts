import { Client as StorachaClient, SpaceDID } from "@storacha/ui-react"
import { JobID, JobRequest, TelegramAuth } from "@/api"
import {  Principal } from '@ipld/dag-ucan'
import * as SpaceBlob from '@storacha/capabilities/space/blob'
import * as SpaceIndex from '@storacha/capabilities/space/index'
import * as Upload from '@storacha/capabilities/upload'
import { NameView } from "@storacha/ucn/api"
import { Buffer } from "buffer/"

// default to 1 hour
const defaultDuration = 1000 * 60 * 60

export interface Context {
  storacha: StorachaClient
  serverDID: Principal,
  name: NameView
  spaceDID: SpaceDID
  encryptionPassword: string
  telegramAuth: TelegramAuth,
  sendRequest: (jr: JobRequest) => Promise<void>
} 

export const create = async (ctx: Context) => {
  return new JobSender(ctx)
}

class JobSender {
  #spaceDID
  #name
  #encryptionPassword
  #telegramAuth
  #storacha
  #serverDID
  #sendRequest

  constructor({ spaceDID, name, encryptionPassword, telegramAuth, storacha, serverDID, sendRequest} : Context) {
    this.#spaceDID = spaceDID
    this.#name = name
    this.#encryptionPassword = encryptionPassword
    this.#telegramAuth = telegramAuth
    this.#storacha = storacha
    this.#serverDID = serverDID
    this.#sendRequest = sendRequest
  }

  async #nameDelegation() {
    const delegation = await this.#name.grant(this.#serverDID.did(), { expiration: defaultDuration})

    const result = await delegation.archive()

    if (result.error) {
      throw result.error
    }
    return result.ok
  }

  async #spaceDelegation() {
    const delegation = await this.#storacha.createDelegation(this.#serverDID, [SpaceBlob.add.can, SpaceIndex.add.can, Upload.add.can], {expiration: new Date(Date.now() + defaultDuration).getTime()})
    const result = await delegation.archive()

    if (result.error) {
      throw result.error
    }
    return result.ok
  }

  async sendJob(jobID: JobID) {
    console.debug('received job, sending to server')

    return this.#sendRequest({
      spaceDID: this.#spaceDID,
      spaceDelegation: await this.#spaceDelegation(),
      nameDelegation: await this.#nameDelegation(),
      encryptionPassword: this.#encryptionPassword, 
      telegramAuth: this.#telegramAuth,
      jobID
    })
  }
}
