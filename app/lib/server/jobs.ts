import { ExecuteJobRequest, TelegramAuth, SpaceDID, CreateJobRequest, FindJobRequest, RemoveJobRequest, LoginRequest } from '@/api'
import { Delegation, DID, Signer } from '@ucanto/client'
import { Client as StorachaClient } from '@storacha/client'
import { create as createCipher } from '@/lib/aes-cbc-cipher'
import { create as createHandler } from './handler'
import { AgentData } from '@storacha/access/agent'
import { serviceConnection, getServerIdentity, receiptsEndpoint, getBotToken } from './constants'
import { validate as validateInitData, parse as parseInitData } from '@telegram-apps/init-data-node';
import { extract } from '@ucanto/core/delegation'
import { getTelegramClient } from './telegram-manager'
import { getDB } from './db'
import { getSession } from './session'

export const login = async (request: LoginRequest) => {
  validateInitData(request.telegramAuth.initData, getBotToken())
  const session = await getSession()
  session.spaceDID = request.spaceDID
  session.telegramAuth = request.telegramAuth
  await session.save()
}

export const createJob = async (request: CreateJobRequest, queueFn: (jr: ExecuteJobRequest) => Promise<void>) => {
    console.debug('adding job...')
    const session = await getSession()
    const telegramId = getTelegramId(session.telegramAuth)
    const db = getDB()
    const dbUser = await db.findOrCreateUser({ storachaSpace: session.spaceDID, telegramId: telegramId.toString() })
    const job = await db.createJob({
      userId: dbUser.id,
      status: 'queued',
      periodFrom: request.period[0], 
      periodTo: (request.period[1] ?? Date.now() / 1000),
      space: session.spaceDID,
      dialogs: [...request.dialogs].map(d => d.toString())
    })
    await queueFn({...request, spaceDID: session.spaceDID, telegramAuth: session.telegramAuth, jobID: job.id})
    console.debug(`job store added job: ${job.id} status: ${job.status}`)
    return job
  }

export const findJob = async (request: FindJobRequest) => {
    const session = await getSession()
    const telegramId = getTelegramId(session.telegramAuth)
    const db = getDB()
    const dbUser = await db.findOrCreateUser({ storachaSpace: session.spaceDID, telegramId: telegramId.toString() })
    return await db.getJobByID(request.jobID, dbUser.id)
  }

export const listJobs = async () => {
    const session = await getSession()
    const telegramId = getTelegramId(session.telegramAuth)
    const db = getDB()
    const dbUser = await db.findOrCreateUser({ storachaSpace: session.spaceDID, telegramId: telegramId.toString() })
    return await db.getJobsByUserID(dbUser.id)
  }

 export const removeJob = async (request: RemoveJobRequest) => {
    console.debug('job store removing job...')
    const session = await getSession()
    const telegramId = getTelegramId(session.telegramAuth)
    const db = getDB()
    const dbUser = await db.findOrCreateUser({ storachaSpace: session.spaceDID, telegramId: telegramId.toString() })
    const job = await db.getJobByID(request.jobID, dbUser.id)
    if (job.status == 'running') {
      throw new Error("job is already running")
    }
    await db.removeJob(request.jobID, dbUser.id)
    console.debug(`job store removed job: ${job.id}`)
    return job
  }

 export const handleJob = async (request: ExecuteJobRequest) => {
    const handler = await initializeHandler(request)
    try {
      return await handler.handleJob(request)
    } finally {
      handler.telegram.disconnect()
    }
  }

const extractDelegation = async (serialized: Uint8Array) => {
  const result = await extract(serialized)
  if (result.error) {
    throw result.error
  }
  return result.ok
}

const initializeHandler = async (request: ExecuteJobRequest) => {
  const spaceDelegation = await extractDelegation(request.spaceDelegation)
  const storacha = initializeStoracha(request.spaceDID, spaceDelegation)
  const { telegram, telegramId } = await initializeTelegram(request.telegramAuth)
  const cipher = createCipher(request.encryptionPassword)
  const db = getDB()
  const dbUser = await db.findOrCreateUser({ storachaSpace: request.spaceDID, telegramId: telegramId.toString() })
  return createHandler({
      storacha, telegram, cipher, db, dbUser
  })
}

export const getTelegramId = (telegramAuth: TelegramAuth) => {
  const initData = parseInitData(telegramAuth.initData)
  return BigInt(initData.user?.id.toString() || '0')
}

const initializeTelegram = async (telegramAuth: TelegramAuth) => {
  const telegramId = getTelegramId(telegramAuth)
  const client = await getTelegramClient(telegramAuth.session)
  
  if(!client.connected){
    console.log('client is disconnected')
    await client.connect()
  }
  
  const user = await client.getMe()
  if (BigInt(user.id.toString()) !== telegramId) {
      throw new Error("authorized user does not match telegram mini-app user")
  }
  return { telegram: client, telegramId }
}

const initializeStoracha = (space: SpaceDID, delegation: Delegation) => {
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


