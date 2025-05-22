import { Client as StorachaClient, SpaceDID } from "@storacha/ui-react"
import { JobID, JobRequest } from "@/api"
import { LaunchParams } from "@telegram-apps/sdk-react"
import {  Principal } from '@ipld/dag-ucan'
import * as SpaceBlob from '@storacha/capabilities/space/blob'
import * as SpaceIndex from '@storacha/capabilities/space/index'
import * as Upload from '@storacha/capabilities/upload'
import * as Filecoin from '@storacha/capabilities/filecoin'
import { NameView } from "@storacha/ucn/api"

// default to 1 hour
const defaultDuration = 1000 * 60 * 60

export interface Context {
  storacha: StorachaClient
  serverDID: Principal,
  name: NameView
  spaceDID: SpaceDID
  encryptionPassword: string
  session: string
  launchParams: LaunchParams
  sendRequest: (jr: JobRequest) => Promise<void>
}

export const create = async (ctx: Context) => {
  return new JobSender(ctx)
}

class JobSender {
  #spaceDID
  #name
  #encryptionPassword
  #session
  #launchParams
  #storacha
  #serverDID
  #sendRequest

  constructor({ spaceDID, name, encryptionPassword, session, launchParams, storacha, serverDID, sendRequest} : Context) {
    this.#spaceDID = spaceDID
    this.#name = name
    this.#encryptionPassword = encryptionPassword
    this.#session = session
    this.#launchParams = launchParams
    this.#storacha = storacha
    this.#serverDID = serverDID
    this.#sendRequest = sendRequest
  }

  async #nameDelegation() {
    const delegation = await this.#name.grant(this.#serverDID.did(), { expiration: new Date(Date.now() + defaultDuration).getTime()})

    const result = await delegation.archive()

    if (result.error) {
      throw result.error
    }
    return result.ok
  }

  async #spaceDelegation() {
    const delegation = await this.#storacha.createDelegation(this.#serverDID, [SpaceBlob.add.can, SpaceIndex.add.can, Upload.add.can, Filecoin.offer.can], {expiration: new Date(Date.now() + defaultDuration).getTime()})
    const result = await delegation.archive()

    if (result.error) {
      throw result.error
    }
    return result.ok
  }

  async sendJob(jobID: JobID) {

    return this.#sendRequest({
      spaceDID: this.#spaceDID,
      spaceDelegation: await this.#spaceDelegation(),
      nameDelegation: await this.#nameDelegation(),
      encryptionPassword: this.#encryptionPassword, 
      telegramAuth: {
        session: this.#session,
        initData: this.#launchParams.initDataRaw || '', 
      },
      jobID
    })
  }
}
