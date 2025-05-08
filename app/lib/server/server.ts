import { JobID, JobRequest, TelegramAuth, Job } from '@/api'
import { Delegation, SpaceDID } from '@storacha/ui-react'
import { Client as StorachaClient, DID, Signer } from '@storacha/ui-react'
import { TelegramClient } from '@/vendor/telegram'
import { create as createObjectStorage } from '@/lib/store/object'
import { create as createCipher } from '@/lib/aes-cbc-cipher'
import { create as createRemoteStorage } from '@/lib/store/remote'
import { create as createHandler } from './handler'
import { create as createJobStorage } from '@/lib/store/jobs'
import { AgentData } from '@storacha/access/agent'
import { serviceConnection, getServerIdentity, receiptsEndpoint, getBotToken, telegramAPIID, telegramAPIHash } from './constants'
import { validate as validateInitData, parse as parseInitData } from '@telegram-apps/init-data-node';
import { StringSession } from '@/vendor/telegram/sessions'
import { TelegramClientParams } from '@/vendor/telegram/client/telegramBaseClient'
import { Name } from '@storacha/ucn'

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

  async #initializeHandler(request: JobRequest) {
    const storacha = this.#initializeStoracha(request.spaceDID, request.spaceDelegation)
    const telegram = await this.#initializeTelegram(request.telegramAuth)
    const cipher = createCipher(request.encryptionPassword)
    const name = Name.from(getServerIdentity(), [request.nameDelegation])
    const remoteStore = createRemoteStorage(storacha)
    const store = createObjectStorage<Record<JobID, Job>>({ remoteStore, name, cipher })
    const jobs = await createJobStorage({ store })
    return createHandler({
      storacha, telegram, cipher, jobs, queueFn: this.#queueFn
    })
  }

  async #initializeTelegram(telegramAuth: TelegramAuth) {
    validateInitData(telegramAuth.initData, getBotToken())
    const initData = parseInitData(telegramAuth.initData)
    const session = new StringSession(telegramAuth.session) 
    const client = new TelegramClient(session, telegramAPIID, telegramAPIHash, defaultClientParams)
    if (!(await client.connect())) {
      throw new Error("failed to connect to telegram")
    }
    if (!(await client.checkAuthorization())) {
      throw new Error("client authorization failed")
    }
    const user = await client.getMe()
    if (user.id !== BigInt(initData.user?.id || 0)) {
       throw new Error("authorized user does not match telegram mini-app user")
    }
    return client
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

