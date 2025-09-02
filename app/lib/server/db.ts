import postgres from 'postgres'
import { Signer } from '@aws-sdk/rds-signer'
import { BaseJob, DialogsById, Job, JobStatus, Ranking, SpaceDID } from '@/api'
import { parseWithUIntArrays, stringifyWithUIntArrays } from '../utils'

const {
  PGHOST,
  PGPORT,
  PGDATABASE,
  PGUSERNAME,
  PGPASSWORD,
  PG_RDS_IAM_AUTH,
  PGSSLMODE,
} = process.env

const isValidSSLValue = (
  sslstring: string
): sslstring is 'require' | 'allow' | 'prefer' | 'verify-full' =>
  ['require', 'allow', 'prefer', 'verify-full'].includes(sslstring)
const validSSLValue = (sslstring: string | undefined) => {
  return sslstring
    ? isValidSSLValue(sslstring)
      ? sslstring
      : undefined
    : undefined
}

export const sql = postgres({
  host: PGHOST,
  port: Number(PGPORT),
  database: PGDATABASE,
  user: PGUSERNAME,
  password: PG_RDS_IAM_AUTH
    ? async () => {
        const signer = new Signer({
          hostname: PGHOST || '',
          port: parseInt(PGPORT || ''),
          username: PGUSERNAME || '',
        })
        const token = await signer.getAuthToken()
        return token
      }
    : PGPASSWORD,
  ssl: validSSLValue(PGSSLMODE),
  idle_timeout: 1,
  transform: {
    ...postgres.camel,
    undefined: null,
  },
})

// Input validation functions
const validateId = (id: string): string => {
  if (!id || typeof id !== 'string' || id.length > 100) {
    throw new Error('Invalid ID provided')
  }
  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid ID format')
  }
  return id
}

const validateTelegramId = (telegramId: string): string => {
  if (!telegramId || typeof telegramId !== 'string' || telegramId.length > 50) {
    throw new Error('Invalid Telegram ID provided')
  }
  // Only allow numeric characters
  if (!/^\d+$/.test(telegramId)) {
    throw new Error('Invalid Telegram ID format')
  }
  return telegramId
}

const validateSpaceDID = (space: string): string => {
  if (!space || typeof space !== 'string' || space.length > 200) {
    throw new Error('Invalid space DID provided')
  }
  // Basic DID format validation
  if (!space.startsWith('did:')) {
    throw new Error('Invalid DID format')
  }
  return space
}

const validateUserInput = (input: any): any => {
  const validated = { ...input }
  
  if (validated.telegramId) {
    validated.telegramId = validateTelegramId(validated.telegramId)
  }
  
  if (validated.storachaSpace) {
    validated.storachaSpace = validateSpaceDID(validated.storachaSpace)
  }
  
  if (validated.storachaAccount && typeof validated.storachaAccount === 'string') {
    validated.storachaAccount = validateSpaceDID(validated.storachaAccount)
  }
  
  return validated
}

const validateJobInput = (input: any): any => {
  const validated = { ...input }
  
  if (validated.id) {
    validated.id = validateId(validated.id)
  }
  
  if (validated.userId) {
    validated.userId = validateId(validated.userId)
  }
  
  if (validated.space) {
    validated.space = validateSpaceDID(validated.space)
  }
  
  return validated
}

// Security logging function
const logSecurityEvent = (event: string, details: any) => {
  console.warn(`[SECURITY] ${event}:`, {
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : 'server-side',
    ip: process.env.REMOTE_ADDR || 'unknown'
  })
}

// Rate limiting helper (basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100

const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    logSecurityEvent('Rate limit exceeded', { identifier, count: record.count })
    return false
  }
  
  record.count++
  return true
}

export interface User {
  id: string
  telegramId: string
  storachaAccount?: string
  storachaSpace: string
  points: number
  createdAt: Date
}

type Input<
  T,
  NoInput extends keyof T,
  OptionalInput extends keyof T = never,
> = Omit<Omit<T, NoInput>, OptionalInput> &
  Partial<Omit<Pick<T, OptionalInput>, NoInput>>

type UserInput = Input<User, 'id' | 'createdAt' | 'points'>

export interface DbJob {
  id: string
  userId: string
  status: JobStatus
  space: SpaceDID
  dialogs: DialogsById
  periodFrom: number
  periodTo: number
  progress: number | null
  startedAt: Date | null
  cause: string | null
  finishedAt: Date | null
  dataCid: string | null
  points: number
  size: number
  createdAt: Date
  updatedAt: Date
}

type JobEvent = { action: string; job: Job }
type JobsCallback = (action: string, job: Job) => void
type UnsubscribeFn = () => void
type JobInput = Input<
  DbJob,
  | 'id'
  | 'progress'
  | 'startedAt'
  | 'cause'
  | 'finishedAt'
  | 'dataCid'
  | 'points'
  | 'size'
  | 'createdAt'
  | 'updatedAt'
>
type LeaderboardWithRanking = { leaderboard: User[]; ranking?: Ranking }
export interface TGDatabase {
  findOrCreateUser(input: UserInput): Promise<User>
  updateUser(id: string, input: User): Promise<User>
  incrementUserPoints(id: string, pointsToAdd: number): Promise<User>
  leaderboard(
    telegramId?: string,
    space?: string
  ): Promise<LeaderboardWithRanking>
  rank(input: UserInput): Promise<Ranking | undefined>
  createJob(input: JobInput): Promise<Job>
  getJobByID(id: string, userId: string): Promise<Job>
  deleteJob(id: string, userId: string): Promise<void>
  getJobsByUserID(userId: string): Promise<Job[]>
  updateJob(id: string, input: Job): Promise<Job>
  removeJob(id: string, userId: string): Promise<void>
  subscribeToJobUpdates(
    userId: string,
    callback: JobsCallback
  ): Promise<UnsubscribeFn>
}

export function getDB(): TGDatabase {
  return {
    async findOrCreateUser(input) {
      const validatedInput = validateUserInput(input)
      
      // Check rate limiting
      const rateLimitKey = `user_creation:${validatedInput.telegramId || 'unknown'}`
      if (!checkRateLimit(rateLimitKey)) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      
      // Use explicit column names instead of dynamic insertion
      const columns = Object.keys(validatedInput).filter(key => 
        validatedInput[key] !== undefined && validatedInput[key] !== null
      )
      const values = columns.map(key => validatedInput[key])
      
      if (columns.length === 0) {
        throw new Error('No valid input provided')
      }
      
      const columnList = columns.join(', ')
      const valuePlaceholders = columns.map((_, i) => `$${i + 1}`).join(', ')
      
      try {
        const results = await sql<User[]>`
          insert into users (${sql.unsafe(columnList)})
          values (${sql.unsafe(valuePlaceholders)})
          on conflict (telegram_id, storacha_space) 
          do update set 
            storacha_account = case 
              when users.storacha_account is null and excluded.storacha_account is not null
              then excluded.storacha_account
              else users.storacha_account
            end
          returning *      
        `(values)
        
        if (!results[0]) {
          throw new Error('error inserting or locating user')
        }
        return results[0]
      } catch (error) {
        logSecurityEvent('Database operation failed', { 
          operation: 'findOrCreateUser', 
          error: error instanceof Error ? error.message : String(error),
          input: { telegramId: validatedInput.telegramId, space: validatedInput.storachaSpace }
        })
        throw error
      }
    },
    async updateUser(id, input) {
      const validatedId = validateId(id)
      const validatedInput = validateUserInput(input)
      
      // Check rate limiting
      const rateLimitKey = `user_update:${validatedId}`
      if (!checkRateLimit(rateLimitKey)) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      
      // Use explicit column names instead of dynamic updates
      const columns = Object.keys(validatedInput).filter(key => 
        validatedInput[key] !== undefined && validatedInput[key] !== null
      )
      const values = columns.map(key => validatedInput[key])
      
      if (columns.length === 0) {
        throw new Error('No valid input provided for update')
      }
      
      const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ')
      
      try {
        const results = await sql<User[]>`
          update users set ${sql.unsafe(setClause)}
          where id = $1
          returning *
        `(validatedId, ...values)
        
        if (!results[0]) {
          throw new Error('error updating user')
        }
        return results[0]
      } catch (error) {
        logSecurityEvent('Database operation failed', { 
          operation: 'updateUser', 
          error: error instanceof Error ? error.message : String(error),
          userId: validatedId
        })
        throw error
      }
    },
    async incrementUserPoints(id, pointsToAdd) {
      const validatedId = validateId(id)
      
      // Check rate limiting
      const rateLimitKey = `points_update:${validatedId}`
      if (!checkRateLimit(rateLimitKey)) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      
      if (typeof pointsToAdd !== 'number' || !Number.isFinite(pointsToAdd)) {
        throw new Error('Invalid points value provided')
      }
      
      // Prevent negative points manipulation
      if (pointsToAdd < -1000 || pointsToAdd > 10000) {
        logSecurityEvent('Suspicious points manipulation attempt', { 
          userId: validatedId, 
          pointsToAdd,
          timestamp: new Date().toISOString()
        })
        throw new Error('Invalid points value provided')
      }
      
      try {
        const results = await sql<User[]>`
          update users set points = points + $2
          where id = $1
          returning *
        `(validatedId, pointsToAdd)
        
        if (!results[0]) {
          throw new Error('error incrementing user points')
        }
        return results[0]
      } catch (error) {
        logSecurityEvent('Database operation failed', { 
          operation: 'incrementUserPoints', 
          error: error instanceof Error ? error.message : String(error),
          userId: validatedId,
          pointsToAdd
        })
        throw error
      }
    },
    async leaderboard(telegramId?: string, space?: string) {
      return await sql.begin(async (sql) => {
        // ensure all queries in this transaction see the same snapshot
        await sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`

        const leaderboard = await sql<User[]>`
          select * from users
          order by points desc
          limit 100
        `

        let ranking: Ranking | undefined

        if (telegramId && space) {
          const results = await sql<{ rank: number }[]>`
            select (select count(*) from users u2 where u2.points>=u1.points) as rank from users u1 where u1.telegram_id=${telegramId} and u1.storacha_space=${space}
          `
          if (results[0]) {
            const totals = await sql<{ total: number }[]>`
              select count(*) as total from users
            `

            if (!totals[0]) {
              throw new Error('error getting total')
            }

            const points = await sql<{ points: number }[]>`
              select points from users 
              where users.telegram_id = ${telegramId} and users.storacha_space=${space}
            `

            if (!points[0]) {
              throw new Error('error getting points')
            }

            const percentile =
              totals[0].total === 1
                ? 100
                : ((totals[0].total - results[0].rank) /
                    (totals[0].total - 1)) *
                  100

            ranking = {
              rank: results[0].rank,
              percentile,
              points: points[0].points,
            }
          }
        }
        return { leaderboard, ranking }
      })
    },
    async rank(input: UserInput) {
      const validatedInput = validateUserInput(input)
      
      const results = await sql<{ rank: number }[]>`
        select (select count(*) from users u2 where u2.points>=u1.points) as rank 
        from users u1 
        where u1.telegram_id = $1 and u1.storacha_space = $2
      `(validatedInput.telegramId, validatedInput.storachaSpace)
      
      if (!results[0]) {
        return undefined
      }

      const totals = await sql<{ total: number }[]>`
        select count(*) as total from users
      `

      if (!totals[0]) {
        throw new Error('error getting total')
      }

      const points = await sql<{ points: number }[]>`
        select points from users 
        where users.telegram_id = $1 and users.storacha_space = $2
      `(validatedInput.telegramId, validatedInput.storachaSpace)

      if (!points[0]) {
        throw new Error('error getting points')
      }

      const percentile =
        totals[0].total === 1
          ? 100
          : ((totals[0].total - results[0].rank) / (totals[0].total - 1)) * 100

      return {
        rank: results[0].rank,
        percentile,
        points: points[0].points,
      }
    },
    async createJob(input) {
      const validatedInput = validateJobInput(input)
      
      // Check rate limiting
      const rateLimitKey = `job_creation:${validatedInput.userId || 'unknown'}`
      if (!checkRateLimit(rateLimitKey)) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      
      // Use explicit column names instead of dynamic insertion
      const columns = Object.keys(validatedInput).filter(key => 
        validatedInput[key] !== undefined && validatedInput[key] !== null
      )
      const values = columns.map(key => validatedInput[key])
      
      if (columns.length === 0) {
        throw new Error('No valid input provided for job creation')
      }
      
      const columnList = columns.join(', ')
      const valuePlaceholders = columns.map((_, i) => `$${i + 1}`).join(', ')
      
      try {
        const results = await sql<DbJob[]>`
          insert into jobs (${sql.unsafe(columnList)})
          values (${sql.unsafe(valuePlaceholders)})
          returning *
        `(values)
        
        if (!results[0]) {
          throw new Error('error inserting job')
        }
        const job = fromDbJob(results[0])
        await sql.notify(
          results[0].userId,
          stringifyWithUIntArrays({ action: 'add', job })
        )
        return job
      } catch (error) {
        logSecurityEvent('Database operation failed', { 
          operation: 'createJob', 
          error: error instanceof Error ? error.message : String(error),
          userId: validatedInput.userId
        })
        throw error
      }
    },
    async deleteJob(id, userId) {
      if (!id) return
      
      const validatedId = validateId(id)
      const validatedUserId = validateId(userId)
      
      // Check rate limiting
      const rateLimitKey = `job_deletion:${validatedUserId}`
      if (!checkRateLimit(rateLimitKey)) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      
      try {
        const results = await sql<DbJob[]>`
          select user_id from jobs where id = $1
        `(validatedId)
        
        if (results.length === 0) {
          logSecurityEvent('Job deletion attempt on non-existent job', { 
            jobId: validatedId, 
            userId: validatedUserId 
          })
          return
        }
        
        if (results[0].userId !== validatedUserId) {
          logSecurityEvent('Unauthorized job deletion attempt', { 
            jobId: validatedId, 
            userId: validatedUserId,
            actualUserId: results[0].userId
          })
          throw new Error('Unauthorized access to job')
        }
        
        await sql<DbJob[]>`
          delete from jobs
          where id = $1 and user_id = $2
        `(validatedId, validatedUserId)
        
        logSecurityEvent('Job deleted successfully', { 
          jobId: validatedId, 
          userId: validatedUserId 
        })
      } catch (error) {
        logSecurityEvent('Database operation failed', { 
          operation: 'deleteJob', 
          error: error instanceof Error ? error.message : String(error),
          jobId: validatedId,
          userId: validatedUserId
        })
        throw error
      }
    },
    async getJobByID(id, userId) {
      const validatedId = validateId(id)
      const validatedUserId = validateId(userId)
      
      // Check rate limiting
      const rateLimitKey = `job_access:${validatedUserId}`
      if (!checkRateLimit(rateLimitKey)) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      
      try {
        const results = await sql<DbJob[]>`
          select * from jobs where id = $1 and user_id = $2
        `(validatedId, validatedUserId)
        
        if (!results[0]) {
          logSecurityEvent('Job access attempt on non-existent job', { 
            jobId: validatedId, 
            userId: validatedUserId 
          })
          throw new Error('Job not found')
        }
        return fromDbJob(results[0])
      } catch (error) {
        logSecurityEvent('Database operation failed', { 
          operation: 'getJobByID', 
          error: error instanceof Error ? error.message : String(error),
          jobId: validatedId,
          userId: validatedUserId
        })
        throw error
      }
    },
    async getJobsByUserID(id) {
      const validatedId = validateId(id)
      
      // Check rate limiting
      const rateLimitKey = `job_listing:${validatedId}`
      if (!checkRateLimit(rateLimitKey)) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      
      try {
        const dbJobs = await sql<DbJob[]>`
          select * from jobs where user_id = $1
        `(validatedId)
        
        return dbJobs.map(fromDbJob)
      } catch (error) {
        logSecurityEvent('Database operation failed', { 
          operation: 'getJobsByUserID', 
          error: error instanceof Error ? error.message : String(error),
          userId: validatedId
        })
        throw error
      }
    },
    async updateJob(id, input) {
      const validatedId = validateId(id)
      const validatedInput = validateJobInput(input)
      
      // Check rate limiting
      const rateLimitKey = `job_update:${validatedId}`
      if (!checkRateLimit(rateLimitKey)) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      
      // Use explicit column names instead of dynamic updates
      const columns = Object.keys(validatedInput).filter(key => 
        validatedInput[key] !== undefined && validatedInput[key] !== null
      )
      const values = columns.map(key => validatedInput[key])
      
      if (columns.length === 0) {
        throw new Error('No valid input provided for job update')
      }
      
      const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ')
      
      // Handle the status check separately to avoid dynamic SQL construction
      const statusIndex = columns.indexOf('status')
      let statusCheck = ''
      let queryValues = [validatedId, ...values]
      
      if (statusIndex !== -1) {
        statusCheck = `and (status != 'canceled' or $${statusIndex + 2} = 'canceled')`
      } else {
        statusCheck = `and status != 'canceled'`
      }
      
      try {
        const results = await sql<DbJob[]>`
          update jobs set ${sql.unsafe(setClause)}
          where id = $1 ${sql.unsafe(statusCheck)}
          returning *
        `(queryValues)
        
        if (!results[0]) {
          throw new Error('error updating job')
        }
        const job = fromDbJob(results[0])
        await sql.notify(
          results[0].userId,
          stringifyWithUIntArrays({ action: 'replace', job })
        )
        return job
      } catch (error) {
        logSecurityEvent('Database operation failed', { 
          operation: 'updateJob', 
          error: error instanceof Error ? error.message : String(error),
          jobId: validatedId
        })
        throw error
      }
    },
    async removeJob(id, userId) {
      const validatedId = validateId(id)
      const validatedUserId = validateId(userId)
      
      // Check rate limiting
      const rateLimitKey = `job_removal:${validatedUserId}`
      if (!checkRateLimit(rateLimitKey)) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      
      try {
        const results = await sql<DbJob[]>`
          delete from jobs where id = $1 and user_id = $2 returning *
         `(validatedId, validatedUserId)
        
        if (!results[0]) {
          logSecurityEvent('Job removal attempt on non-existent job', { 
            jobId: validatedId, 
            userId: validatedUserId 
          })
          throw new Error('error removing job')
        }
        
        await sql.notify(
          results[0].userId,
          stringifyWithUIntArrays({
            action: 'remove',
            job: fromDbJob(results[0]),
          })
        )
        
        logSecurityEvent('Job removed successfully', { 
          jobId: validatedId, 
          userId: validatedUserId 
        })
      } catch (error) {
        logSecurityEvent('Database operation failed', { 
          operation: 'removeJob', 
          error: error instanceof Error ? error.message : String(error),
          jobId: validatedId,
          userId: validatedUserId
        })
        throw error
      }
    },
    async subscribeToJobUpdates(userId, callback) {
      const validatedUserId = validateId(userId)
      
      // Check rate limiting
      const rateLimitKey = `job_subscription:${validatedUserId}`
      if (!checkRateLimit(rateLimitKey)) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      
      try {
        const result = await sql.listen(validatedUserId, (value) => {
          const { action, job } = parseWithUIntArrays(value) as JobEvent
          callback(action, job)
        })
        
        logSecurityEvent('Job subscription created', { 
          userId: validatedUserId 
        })
        
        return result.unlisten
      } catch (error) {
        logSecurityEvent('Database operation failed', { 
          operation: 'subscribeToJobUpdates', 
          error: error instanceof Error ? error.message : String(error),
          userId: validatedUserId
        })
        throw error
      }
    },
  }
}

type DbJobParams = Omit<DbJob, 'userId'>
const toDbJobParams = (job: Job): DbJobParams => {
  const baseDbJob: DbJobParams = {
    id: job.id,
    status: job.status,
    space: job.params.space,
    dialogs: job.params.dialogs,
    periodFrom: job.params.period[0],
    periodTo: job.params.period[1],
    progress: null,
    startedAt: null,
    cause: null,
    finishedAt: null,
    dataCid: null,
    points: 0,
    size: 0,
    createdAt: new Date(job.created),
    updatedAt: new Date(job.updated),
  }
  switch (job.status) {
    case 'waiting':
      return baseDbJob
    case 'queued':
      return baseDbJob
    case 'canceled':
      // Preserve any fields that exist on the job
      return {
        ...baseDbJob,
        finishedAt: new Date(job.finished),
        progress: job.progress ?? null,
        startedAt: job.started ? new Date(job.started) : null,
      }
    case 'running':
      return {
        ...baseDbJob,
        progress: job.progress,
        startedAt: new Date(job.started),
      }
    case 'failed':
      return {
        ...baseDbJob,
        progress: job.progress,
        cause: job.cause,
        startedAt: job.started ? new Date(job.started) : null,
        finishedAt: new Date(job.finished),
      }
    case 'completed':
      return {
        ...baseDbJob,
        startedAt: new Date(job.started),
        finishedAt: new Date(job.finished),
        dataCid: job.data,
        points: job.points ?? 0,
        size: job.size ?? 0,
      }
  }
}

const objectToUint8Array = (obj: Record<string, number>) => {
  return new Uint8Array(Object.values(obj))
}

const fixDialogInfoMap = (dialogs: DialogsById): DialogsById => {
  const fixed: DialogsById = {}
  for (const [id, info] of Object.entries(dialogs)) {
    if (
      info.photo?.strippedThumb &&
      !(info.photo.strippedThumb instanceof Uint8Array)
    ) {
      info.photo.strippedThumb = objectToUint8Array(info.photo.strippedThumb)
    }
    fixed[id] = info
  }
  return fixed
}

const fromDbJob = (dbJob: DbJob): Job => {
  const baseJob: BaseJob = {
    id: dbJob.id,
    status: dbJob.status,
    params: {
      space: dbJob.space,
      dialogs: fixDialogInfoMap(dbJob.dialogs),
      period: [dbJob.periodFrom, dbJob.periodTo],
    },
    created: dbJob.createdAt.getTime(),
    updated: dbJob.updatedAt.getTime(),
  }
  switch (dbJob.status) {
    case 'waiting':
      return { ...baseJob, status: 'waiting' }
    case 'queued':
      return { ...baseJob, status: 'queued' }
    case 'canceled':
      if (dbJob.finishedAt == null) {
        throw new Error('finishedAt should not be null on canceled job')
      }
      return {
        ...baseJob,
        status: 'canceled',
        finished: dbJob.finishedAt.getDate(),
        ...(dbJob.progress != null ? { progress: dbJob.progress } : {}),
        ...(dbJob.startedAt != null
          ? { started: dbJob.startedAt.getTime() }
          : {}),
      }
    case 'running':
      if (dbJob.progress == null) {
        throw new Error('progress should not be null on running job')
      }
      if (dbJob.startedAt == null) {
        throw new Error('started at should not be null on running job')
      }
      return {
        ...baseJob,
        status: 'running',
        progress: dbJob.progress,
        started: dbJob.startedAt.getTime(),
      }
    case 'failed':
      if (dbJob.progress == null) {
        throw new Error('progress should not be null on failed job')
      }
      if (dbJob.cause == null) {
        throw new Error('cause should not be null on failed job')
      }
      if (dbJob.finishedAt == null) {
        throw new Error('finishedAt should not be null on failed job')
      }
      return {
        ...baseJob,
        status: 'failed',
        progress: dbJob.progress,
        cause: dbJob.cause,
        started: dbJob.startedAt?.getDate(),
        finished: dbJob.finishedAt.getDate(),
      }
    case 'completed':
      if (dbJob.startedAt == null) {
        throw new Error('started at should not be null on completed job')
      }
      if (dbJob.finishedAt == null) {
        throw new Error('finishedAt should not be null on completed job')
      }
      if (dbJob.dataCid == null) {
        throw new Error('dataCid should not be null on completed job')
      }
      return {
        ...baseJob,
        status: 'completed',
        started: dbJob.startedAt.getTime(),
        finished: dbJob.finishedAt.getDate(),
        data: dbJob.dataCid,
        points: dbJob.points,
        size: dbJob.size,
      }
  }
}
