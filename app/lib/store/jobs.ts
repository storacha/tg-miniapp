import { Client as StorachaClient } from '@storacha/ui-react'
import { JobID, JobStorage, Period, JobClient, DialogsById } from '@/api'
import { Principal } from '@ipld/dag-ucan'
import * as SpaceBlob from '@storacha/capabilities/space/blob'
import * as SpaceIndex from '@storacha/capabilities/space/index'
import * as Upload from '@storacha/capabilities/upload'
import * as Filecoin from '@storacha/capabilities/filecoin'

export interface Context {
  storacha: StorachaClient
  serverDID: Principal
  encryptionPassword: string
  jobClient: JobClient
}

// default to 1 hour
const defaultDuration = 1000 * 60 * 60

export const create = async (ctx: Context) => {
  return new Store(ctx)
}

class Store extends EventTarget implements JobStorage {
  public target
  #encryptionPassword
  #storacha
  #serverDID
  #jobClient

  constructor({ encryptionPassword, storacha, serverDID, jobClient }: Context) {
    super()
    this.#encryptionPassword = encryptionPassword
    this.#storacha = storacha
    this.#serverDID = serverDID
    this.#jobClient = jobClient
    this.target = this
  }

  async #spaceDelegation() {
    const delegation = await this.#storacha.createDelegation(
      this.#serverDID,
      [
        SpaceBlob.add.can,
        SpaceIndex.add.can,
        Upload.add.can,
        Filecoin.offer.can,
      ],
      { expiration: new Date(Date.now() + defaultDuration).getTime() }
    )
    const result = await delegation.archive()

    if (result.error) {
      throw result.error
    }
    return result.ok
  }

  find(id: JobID) {
    return this.#jobClient.findJob({
      jobID: id,
    })
  }

  async listPending() {
    const allJobs = await this.#jobClient.listJobs({})
    return {
      items: allJobs.filter(
        (j) =>
          j.status === 'waiting' ||
          j.status === 'queued' ||
          j.status === 'running' ||
          j.status === 'failed'
      ),
    }
  }

  async listCompleted() {
    const allJobs = await this.#jobClient.listJobs({})
    return { items: allJobs.filter((j) => j.status === 'completed') }
  }

  async add(dialogs: DialogsById, period: Period) {
    console.debug('job store adding job...')
    const job = await this.#jobClient.createJob({
      dialogs,
      period,
      spaceDelegation: await this.#spaceDelegation(),
      encryptionPassword: this.#encryptionPassword,
    })
    this.target.dispatchEvent(new CustomEvent('add', { detail: job }))
    console.debug(`job store added job: ${job.id} status: ${job.status}`)
    return job
  }

  async remove(id: JobID) {
    console.debug('job store removing job...')
    const job = await this.#jobClient.removeJob({
      jobID: id,
    })
    this.target.dispatchEvent(new CustomEvent('remove', { detail: job }))
    console.debug(`job store removed job: ${job.id}`)
  }

  async cancel(id: JobID) {
    console.debug('job store canceling job...')
    const job = await this.#jobClient.cancelJob({
      jobID: id,
    })
    this.target.dispatchEvent(new CustomEvent('cancel', { detail: job }))
    console.debug(`job store canceled job: ${job.id}`)
  }
}
