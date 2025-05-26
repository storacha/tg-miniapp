import { Client as StorachaClient, SpaceDID } from "@storacha/ui-react"
import { JobID, JobStorage, Auth, Period,  JobClient } from "@/api"
import { LaunchParams } from "@telegram-apps/sdk-react"
import {  Principal } from '@ipld/dag-ucan'
import * as SpaceBlob from '@storacha/capabilities/space/blob'
import * as SpaceIndex from '@storacha/capabilities/space/index'
import * as Upload from '@storacha/capabilities/upload'
import * as Filecoin from '@storacha/capabilities/filecoin'

export interface Context {
  storacha: StorachaClient
  serverDID: Principal,
  spaceDID: SpaceDID
  encryptionPassword: string
  session: string
  launchParams: LaunchParams
  jobClient: JobClient
}

// default to 1 hour
const defaultDuration = 1000 * 60 * 60

export const create = async (ctx: Context) => {
  return new Store(ctx)
}

class Store extends EventTarget implements JobStorage {
  public target
  #spaceDID
  #encryptionPassword
  #session
  #launchParams
  #storacha
  #serverDID
  #jobClient

  constructor({ spaceDID, encryptionPassword, session, launchParams, storacha, serverDID, jobClient} : Context) {
    super()
    this.#spaceDID = spaceDID
    this.#encryptionPassword = encryptionPassword
    this.#session = session
    this.#launchParams = launchParams
    this.#storacha = storacha
    this.#serverDID = serverDID
    this.#jobClient = jobClient
    this.target = this
  }

  #authParams() : Auth {
    return {
      spaceDID: this.#spaceDID,
      telegramAuth: {
        session: this.#session,
        initData: this.#launchParams.initDataRaw || '', 
      },
    }
  }

  async #spaceDelegation() {
    const delegation = await this.#storacha.createDelegation(this.#serverDID, [SpaceBlob.add.can, SpaceIndex.add.can, Upload.add.can, Filecoin.offer.can], {expiration: new Date(Date.now() + defaultDuration).getTime()})
    const result = await delegation.archive()

    if (result.error) {
      throw result.error
    }
    return result.ok
  }

  find (id: JobID) {
    const auth = this.#authParams()
    return this.#jobClient.findJob({
      ...auth,
      jobID: id
    })
  }

  async listPending () {
    const allJobs = await this.#jobClient.listJobs(this.#authParams())
    return { items: allJobs.filter((j) => (j.status === 'waiting' || j.status === 'queued' || j.status === 'running' || j.status === 'failed')) }
  }

  async listCompleted () {
    const allJobs = await this.#jobClient.listJobs(this.#authParams())
    return { items: allJobs.filter((j) => (j.status === 'completed')) }
  }

  async add (dialogs: Set<bigint>, period: Period) {
    console.debug('job store adding job...')
    const auth = this.#authParams()
    const job = await this.#jobClient.createJob({
      ...auth,
      dialogs,
      period,
      spaceDelegation: await this.#spaceDelegation(),
      encryptionPassword: this.#encryptionPassword, 
    })
    this.target.dispatchEvent(new CustomEvent('add', { detail: job }))
    console.debug(`job store added job: ${job.id} status: ${job.status}`)
    return job
  }


  async remove (id: JobID) {
    console.debug('job store removing job...')
    const job = await this.#jobClient.removeJob({
      ...this.#authParams(),
      jobID: id
    })
    this.target.dispatchEvent(new CustomEvent('remove', { detail: job }))
    console.debug(`job store removed job: ${job.id}`)
  }
}