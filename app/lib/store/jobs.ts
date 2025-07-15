import { Client as StorachaClient } from '@storacha/ui-react'
import {
  JobID,
  JobStorage,
  Period,
  JobClient,
  DialogsById,
  ToString,
  EntityID,
} from '@/api'
import { Principal } from '@ipld/dag-ucan'
import * as SpaceBlob from '@storacha/capabilities/space/blob'
import * as SpaceIndex from '@storacha/capabilities/space/index'
import * as Upload from '@storacha/capabilities/upload'
import * as Filecoin from '@storacha/capabilities/filecoin'
import * as Usage from '@storacha/capabilities/usage'
import { MAX_FREE_BYTES } from '../server/constants'
import { formatBytes } from '../utils'
import * as SSstore from '@storacha/capabilities/store'

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
        SpaceBlob.remove.can,
        SpaceIndex.add.can,
        Upload.add.can,
        Upload.remove.can,
        Upload.get.can,
        SSstore.remove.can,
        Filecoin.offer.can,
        Usage.report.can,
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
    try {
      const space = this.#storacha.currentSpace()
      if (!space) {
        throw new Error('No space found. Try again.')
      }
      const now = new Date()
      const usage = await this.#storacha.capability.usage.report(space?.did(), {
        from: new Date(
          now.getUTCFullYear(),
          now.getUTCMonth() - 1,
          now.getUTCDate(),
          0,
          0,
          0,
          0
        ),
        to: now,
      })

      const amountOfStorageUsed = Object.values(usage).reduce(
        (sum, report) => sum + report.size.final,
        0
      )

      if (amountOfStorageUsed >= MAX_FREE_BYTES) {
        // ...or delete old backups
        // i suppose we can add the phrase above when the delete feature is ready.
        throw new Error(
          `You have reached your ${formatBytes(MAX_FREE_BYTES)} free storage limit. Upgrade your account`
        )
      }
    } catch (err) {
      if ((err as Error)?.message?.includes('free storage limit')) {
        throw err
      }
      console.warn('Could not check storage usage before job creation:', err)
    }

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

  async deleteDialog(id: JobID, dialogID: ToString<EntityID>) {
    console.debug('deleting job...')
    const job = await this.#jobClient.deleteDialogFromJob({
      jobID: id,
      dialogID,
      spaceDelegation: await this.#spaceDelegation(),
      encryptionPassword: this.#encryptionPassword,
    })
    this.target.dispatchEvent(new CustomEvent('delete', { detail: job }))
    console.debug(`job store deleted job: ${id}`)
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
