import {
  ExecuteJobRequest,
  TelegramAuth,
  SpaceDID,
  CreateJobRequest,
  FindJobRequest,
  RemoveJobRequest,
  LoginRequest,
  CancelJobRequest,
  DeleteDialogFromJobRequest,
} from '@/api'
import { Delegation, DID, Signer } from '@ucanto/client'
import { Client as StorachaClient } from '@storacha/client'
import { create as createCipher } from '@/lib/aes-cbc-cipher'
import { create as createHandler } from './handler'
import { AgentData } from '@storacha/access/agent'
import {
  serviceConnection,
  getServerIdentity,
  receiptsEndpoint,
  getBotToken,
} from './constants'
import {
  validate as validateInitData,
  parse as parseInitData,
} from '@telegram-apps/init-data-node'
import { extract } from '@ucanto/core/delegation'
import { getTelegramClient } from './telegram-manager'
import { getDB } from './db'
import { getSession } from './session'
import { createLogger } from './logger'

export const login = async (request: LoginRequest) => {
  validateInitData(request.telegramAuth.initData, getBotToken())
  const session = await getSession()
  session.spaceDID = request.spaceDID
  session.telegramAuth = request.telegramAuth
  await session.save()
}

export const createJob = async (
  request: CreateJobRequest,
  queueFn: (jr: ExecuteJobRequest) => Promise<void>
) => {
  const logger = createLogger()
  const session = await getSession()
  const telegramId = getTelegramId(session.telegramAuth)
  const db = getDB()
  const dbUser = await db.findOrCreateUser({
    storachaSpace: session.spaceDID,
    telegramId: telegramId.toString(),
  })
  const job = await db.createJob({
    userId: dbUser.id,
    status: 'queued',
    periodFrom: request.period[0],
    periodTo: request.period[1] ?? Date.now() / 1000,
    space: session.spaceDID,
    dialogs: request.dialogs,
  })
  await queueFn({
    ...request,
    spaceDID: session.spaceDID,
    telegramAuth: session.telegramAuth,
    jobID: job.id,
  })
  logger.info('Job created and queued', {
    jobId: job.id,
    userId: dbUser.id,
    step: 'createJob',
    phase: 'init',
    status: job.status,
  })
  return job
}

export const findJob = async (request: FindJobRequest) => {
  const session = await getSession()
  const telegramId = getTelegramId(session.telegramAuth)
  const db = getDB()
  const dbUser = await db.findOrCreateUser({
    storachaSpace: session.spaceDID,
    telegramId: telegramId.toString(),
  })
  return await db.getJobByID(request.jobID, dbUser.id)
}

export const listJobs = async () => {
  const session = await getSession()
  const telegramId = getTelegramId(session.telegramAuth)
  const db = getDB()
  const dbUser = await db.findOrCreateUser({
    storachaSpace: session.spaceDID,
    telegramId: telegramId.toString(),
  })
  return await db.getJobsByUserID(dbUser.id)
}

export const removeJob = async (request: RemoveJobRequest) => {
  const session = await getSession()
  const telegramId = getTelegramId(session.telegramAuth)
  const db = getDB()
  const dbUser = await db.findOrCreateUser({
    storachaSpace: session.spaceDID,
    telegramId: telegramId.toString(),
  })
  const job = await db.getJobByID(request.jobID, dbUser.id)
  const logger = createLogger({ jobId: job.id, userId: dbUser.id })

  if (job.status == 'running') {
    logger.warn('Attempted to remove running job', {
      step: 'removeJob',
      phase: 'processing',
      status: job.status,
    })
    throw new Error('job is already running')
  }

  await db.removeJob(request.jobID, dbUser.id)

  logger.info('Job removed', {
    step: 'removeJob',
    phase: 'processing',
    status: job.status,
  })

  return job
}

export const cancelJob = async (request: CancelJobRequest) => {
  const session = await getSession()
  const telegramId = getTelegramId(session.telegramAuth)
  const db = getDB()
  const dbUser = await db.findOrCreateUser({
    storachaSpace: session.spaceDID,
    telegramId: telegramId.toString(),
  })
  const job = await db.getJobByID(request.jobID, dbUser.id)
  const logger = createLogger({ jobId: job.id, userId: dbUser.id })

  await db.updateJob(request.jobID, {
    ...job,
    status: 'canceled',
    updated: Date.now(),
    finished: Date.now(),
  })

  logger.info('Job canceled', {
    step: 'cancelJob',
    phase: 'completed',
    status: job.status,
  })

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

export const deleteDialogFromJob = async (
  request: DeleteDialogFromJobRequest
) => {
  const session = await getSession()
  const req = { ...request, ...session }
  const handler = await initializeHandler(req)
  try {
    return await handler.deleteDialogFromJob(req)
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
  const { telegram, telegramId } = await initializeTelegram(
    request.telegramAuth
  )
  const cipher = createCipher(request.encryptionPassword)
  const db = getDB()
  const dbUser = await db.findOrCreateUser({
    storachaSpace: request.spaceDID,
    telegramId: telegramId.toString(),
  })
  return await createHandler({
    storacha,
    telegram,
    cipher,
    db,
    dbUser,
  })
}

export const getTelegramId = (telegramAuth: TelegramAuth) => {
  if (!telegramAuth) {
    throw new Error('Session not found or expired.')
  }
  const initData = parseInitData(telegramAuth.initData)
  return BigInt(initData.user?.id.toString() || '0')
}

const initializeTelegram = async (telegramAuth: TelegramAuth) => {
  const telegramId = getTelegramId(telegramAuth)
  const client = await getTelegramClient(telegramAuth.session)

  if (!client.connected) {
    console.log('client is disconnected')
    await client.connect()
  }

  const user = await client.getMe()
  if (BigInt(user.id.toString()) !== telegramId) {
    throw new Error('authorized user does not match telegram mini-app user')
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

  // Import gateway connection dependencies
  const { connect } = require('@ucanto/client')
  const { CAR, HTTP } = require('@ucanto/transport')
  const { DID } = require('@ipld/dag-ucan/did')

  // Get gateway URL and principal from environment
  const gatewayURL = process.env.NEXT_PUBLIC_STORACHA_GATEWAY_URL || 'https://w3s.link'
  const gatewayPrincipal = process.env.NEXT_PUBLIC_STORACHA_GATEWAY_DID
    ? DID.parse(process.env.NEXT_PUBLIC_STORACHA_GATEWAY_DID)
    : undefined

  // Only create gateway connection if principal is available
  const gatewayConnection = gatewayPrincipal
    ? connect({
        id: gatewayPrincipal,
        codec: CAR.outbound,
        channel: HTTP.open({
          url: new URL(gatewayURL),
          method: 'POST',
          headers: {
            'X-Client': `Storacha/1 (js; browser) TelegramMiniapp/${(process.env.NEXT_PUBLIC_VERSION ?? '1.0.0').split('.')[0]}`,
          },
        }),
      })
    : undefined

  const storachaClient = new StorachaClient(agentData, {
    serviceConf: {
      access: serviceConnection,
      upload: serviceConnection,
      filecoin: serviceConnection,
      gateway: gatewayConnection || serviceConnection, // fallback if not set
    },
    receiptsEndpoint,
  })
  storachaClient.addProof(delegation)
  return storachaClient
}
