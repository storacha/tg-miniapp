import { JobID, JobRequest, TelegramAuth, Job, SpaceDID } from '@/api'
import { Delegation, DID, Signer } from '@ucanto/client'
import { Client as StorachaClient } from '@storacha/client'
import { create as createObjectStorage } from '@/lib/store/object'
import { create as createCipher } from '@/lib/aes-cbc-cipher'
import { create as createRemoteStorage } from '@/lib/store/remote'
import { create as createHandler } from './handler'
import { create as createJobStorage } from '@/lib/store/jobs'
import { AgentData } from '@storacha/access/agent'
import { serviceConnection, getServerIdentity, receiptsEndpoint, getBotToken } from './constants'
import { validate as validateInitData, parse as parseInitData } from '@telegram-apps/init-data-node';
import { StringSession } from 'telegram/sessions'
import { Name } from '@storacha/ucn'
import { extract } from '@ucanto/core/delegation'
import { getServerTelegramClient } from '@/components/server'

// const defaultClientParams: TelegramClientParams = { connectionRetries: 5 }

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

  async #initializeTelegram(telegramAuth: TelegramAuth) {
    validateInitData(telegramAuth.initData, getBotToken())
    const initData = parseInitData(telegramAuth.initData)
    const session = new StringSession(telegramAuth.session) 
    const client = await getServerTelegramClient(session)
    // // DC ip servers need to be set to IP addresses on node
    // // see https://github.com/gram-js/gramjs/issues/344#issuecomment-1405518285
    // // and further discussion in @gramjschat on Telegram
    // const dcServers : Record<number, string> = {
    //   1: "149.154.175.54",
    //   2: "149.154.167.50",
    //   3: "149.154.175.100",
    //   4: "149.154.167.91",
    //   5: "91.108.56.103",
    // }; 
    // session.setDC(session.dcId, dcServers[session.dcId], session.port)
    // const client = new TelegramClient(session, telegramAPIID, telegramAPIHash, defaultClientParams)

    // if (!(await client.connect())) {
    //   throw new Error("failed to connect to telegram")
    // }
    // if (!(await client.checkAuthorization())) {
    //   throw new Error("client authorization failed")
    // }
    if(!client.connected){
      console.log('client is disconnected')
		  await client.connect()
	  }
    const user = await client.getMe()
    if (user.id.toString() !== (initData.user?.id.toString() || '0')) {
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

