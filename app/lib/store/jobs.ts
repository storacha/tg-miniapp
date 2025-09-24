import { AccountDID, Client as StorachaClient } from '@storacha/ui-react'
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
import { formatBytes } from '../utils'
import { MAX_FREE_BYTES } from '../server/constants'
import {
  createServerDelegations,
  getStorachaUsage,
  isStorageLimitExceeded,
} from '../storacha'

export interface Context {
  storacha: StorachaClient
  serverDID: Principal
  accountDID: AccountDID
  encryptionPassword: string
  jobClient: JobClient
}

export const create = async (ctx: Context) => {
  return new Store(ctx)
}

class Store extends EventTarget implements JobStorage {
  public target
  #encryptionPassword
  #storacha
  #serverDID
  #jobClient
  #accountDID

  constructor({
    encryptionPassword,
    storacha,
    serverDID,
    jobClient,
    accountDID,
  }: Context) {
    super()
    this.#encryptionPassword = encryptionPassword
    this.#storacha = storacha
    this.#serverDID = serverDID
    this.#jobClient = jobClient
    this.#accountDID = accountDID
    this.target = this
  }

  async #spaceDelegation() {
    return createServerDelegations(
      this.#storacha,
      this.#serverDID,
      this.#accountDID
    )
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

    const space = this.#storacha.currentSpace()
    if (!space) {
      throw new Error('No space was found!')
    }

    try {
      // check if the user has enough storage space
      const amountOfStorageUsed = await getStorachaUsage(
        this.#storacha,
        space.did()
      )

      if (await isStorageLimitExceeded(this.#storacha, amountOfStorageUsed)) {
        throw new Error(
          `You have reached your ${formatBytes(
            MAX_FREE_BYTES
          )} free storage limit. Upgrade your account`
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
