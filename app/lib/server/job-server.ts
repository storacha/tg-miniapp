import { JobID, JobRequest, TelegramAuth, Job, SpaceDID } from '@/api'
import { Delegation, DID, Signer } from '@ucanto/client'
import { Client as StorachaClient } from '@storacha/client'
import { TelegramClient } from 'telegram'
import { create as createObjectStorage } from '@/lib/store/object'
import { create as createCipher } from '@/lib/aes-cbc-cipher'
import { create as createRemoteStorage } from '@/lib/store/remote'
import { create as createHandler } from './handler'
import { create as createJobStorage } from '@/lib/store/jobs'
import { AgentData } from '@storacha/access/agent'
import { serviceConnection, getServerIdentity, receiptsEndpoint, getBotToken, telegramAPIID, telegramAPIHash } from './constants'
import { validate as validateInitData, parse as parseInitData } from '@telegram-apps/init-data-node';
import { StringSession } from 'telegram/sessions'
import { TelegramClientParams } from 'telegram/client/telegramBaseClient'
import { Name } from '@storacha/ucn'
import { extract } from '@ucanto/core/delegation'
const defaultClientParams: TelegramClientParams = { connectionRetries: 5 }

export interface Context {
    queueFn: (jr: JobRequest) => Promise<void>
}

export const create = async (ctx: Context) => {
  return new JobServer(ctx)
}

class JobServer {

  #queueFn

  constructor ({  queueFn }: Context) {

    this.#queueFn = queueFn
  }

  async queueJob(request: JobRequest) {
    const handler = await this.#initializeHandler(request)
    return await handler.queueJob(request)
  }

  async handleJob(request: JobRequest) {
    const handler = await this.#initializeHandler(request)
    return await handler.handleJob(request)
  }

  async #extractDelegation(serialized: Uint8Array) {
    const result = await extract(serialized)
    if (result.error) {
      throw result.error
    }
    return result.ok
  }

  async #initializeHandler(request: JobRequest) {
    const spaceDelegation = await this.#extractDelegation(request.spaceDelegation)
    const nameDelegation = await this.#extractDelegation(request.nameDelegation)
    const storacha = this.#initializeStoracha(request.spaceDID, spaceDelegation)
    const telegram = await this.#initializeTelegram(request.telegramAuth)
    const cipher = createCipher(request.encryptionPassword)
    const name = Name.from(getServerIdentity(), [nameDelegation])
    const remoteStore = createRemoteStorage(storacha)
    const store = createObjectStorage<Record<JobID, Job>>({ remoteStore, name, cipher })
    const jobs = await createJobStorage({ store })
    return createHandler({
      storacha, telegram, cipher, jobs, queueFn: this.#queueFn
    })
  }

  #initializeStoracha(space: SpaceDID, delegation: Delegation) {
    // Create AgentData manually because we don't want to use a store.
    const agentData = new AgentData({
      // FIXME: The Storacha client thinks a principal has to be a `did:key`,
      // which is a bit silly. All DIDs have keys, and any `Signer` by
      // definition has its private key loaded and can sign.
      principal: getServerIdentity() as unknown as Signer<DID<'key'>>,
      delegations: new Map(),
      meta: {
        name: 'bluesky-backups',
        type: 'service',
        description: 'Bluesky Backups Service',
      },
      spaces: new Map(),
      currentSpace: space,
    })

    const storachaClient = new StorachaClient(agentData, {
      serviceConf: {
        access: serviceConnection,
        upload: serviceConnection,
        filecoin: serviceConnection,

        // TODO: This should point to the gateway, but we don't actually use it
        // (yet), so we'll leave a dummy implementation here for now.
        gateway: {
          ...serviceConnection,
          execute() {
            throw new Error('Gateway connection not implemented')
          },
        },
      },
      receiptsEndpoint,
    })
    storachaClient.addProof(delegation)
    return storachaClient
  }

}

