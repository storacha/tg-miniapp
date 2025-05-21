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

// const CURRENT_VERSION = "1";

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

  // #saveSessionToString() {
  //   // This code is copied from 
  //   // https://github.com/gram-js/gramjs/blob/master/gramjs/sessions/StringSession.ts#L95-L124
  //   // note that "Buffer" here is not node:buffer but the 'buffer' package
  //   if (!this.#session.authKey || !this.#session.serverAddress || !this.#session.port) {
  //       return "";
  //   }
  //   // TS is weird
  //   const key = this.#session.authKey.getKey();
  //   if (!key) {
  //       return "";
  //   }
  //   const dcBuffer = Buffer.from([this.#session.dcId]);
  //   const addressBuffer = Buffer.from(this.#session.serverAddress);
  //   const addressLengthBuffer = Buffer.alloc(2);
  //   addressLengthBuffer.writeInt16BE(addressBuffer.length, 0);
  //   const portBuffer = Buffer.alloc(2);
  //   portBuffer.writeInt16BE(this.#session.port, 0);
  
  //   return (
  //       CURRENT_VERSION +
  //       StringSession.encode(
  //           Buffer.concat([
  //               dcBuffer,
  //               addressLengthBuffer,
  //               addressBuffer,
  //               portBuffer,
  //               key,
  //           ])
  //       )
  //   );
  // }

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
