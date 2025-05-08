import { Client as StorachaClient, SpaceDID } from "@storacha/ui-react"
import { JobID, JobRequest } from "@/api"
import { LaunchParams } from "@telegram-apps/sdk-react"
import { Session, StringSession } from "@/vendor/telegram/sessions"
import {  Principal } from '@ipld/dag-ucan'
import * as SpaceBlob from '@storacha/capabilities/space/blob'
import * as SpaceIndex from '@storacha/capabilities/space/index'
import * as Upload from '@storacha/capabilities/upload'
import { NameView } from "@storacha/ucn/api"


// default to 1 hour
const defaultDuration = 1000 * 60 * 60

const CURRENT_VERSION = "1";

export interface Context {
  storacha: StorachaClient
  servicePrincipal: Principal,
  name: NameView
  spaceDID: SpaceDID
  encryptionPassword: string
  session: Session
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
  #servicePrincipal
  #sendRequest

  constructor({ spaceDID, name, encryptionPassword, session, launchParams, storacha, servicePrincipal, sendRequest} : Context) {
    this.#spaceDID = spaceDID
    this.#name = name
    this.#encryptionPassword = encryptionPassword
    this.#session = session
    this.#launchParams = launchParams
    this.#storacha = storacha
    this.#servicePrincipal = servicePrincipal
    this.#sendRequest = sendRequest
  }

  #saveSessionToString() {
    if (!this.#session.authKey || !this.#session.serverAddress || !this.#session.port) {
        return "";
    }
    // TS is weird
    const key = this.#session.authKey.getKey();
    if (!key) {
        return "";
    }
    const dcBuffer = Buffer.from([this.#session.dcId]);
    const addressBuffer = Buffer.from(this.#session.serverAddress);
    const addressLengthBuffer = Buffer.alloc(2);
    addressLengthBuffer.writeInt16BE(addressBuffer.length, 0);
    const portBuffer = Buffer.alloc(2);
    portBuffer.writeInt16BE(this.#session.port, 0);
  
    return (
        CURRENT_VERSION +
        StringSession.encode(
            Buffer.concat([
                dcBuffer,
                addressLengthBuffer,
                addressBuffer,
                portBuffer,
                key,
            ])
        )
    );
  }

  #nameDelegation() {
    return this.#name.grant(this.#servicePrincipal.did(), { expiration: defaultDuration})
  }

  #spaceDelegation() {
    return this.#storacha.createDelegation(this.#servicePrincipal, [SpaceBlob.add.can, SpaceIndex.add.can, Upload.add.can], {expiration: new Date(Date.now() + defaultDuration).getTime()})
  }

  async sendJob(jobID: JobID) {

    return this.#sendRequest({
      spaceDID: this.#spaceDID,
      spaceDelegation: await this.#spaceDelegation(),
      nameDelegation: await this.#nameDelegation(),
      encryptionPassword: this.#encryptionPassword, 
      telegramAuth: {
        session: this.#saveSessionToString(),
        initData: this.#launchParams.initDataRaw || '', 
      },
      jobID
    })
  }
}
