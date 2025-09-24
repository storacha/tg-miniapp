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
  setJobAsQueued(id: string): Promise<void>
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
      const results = await sql<User[]>`
        insert into users ${sql(input)}
        on conflict (telegram_id, storacha_space) 
        do update set 
          storacha_account = case 
            when users.storacha_account is null and excluded.storacha_account is not null
            then excluded.storacha_account
            else users.storacha_account
          end
        returning *      
      `
      if (!results[0]) {
        throw new Error('error inserting or locating user')
      }
      return results[0]
    },
    async updateUser(id, input) {
      const results = await sql<User[]>`
        update users set ${sql(input)}
        where id = ${id}
        returning *
      `
      if (!results[0]) {
        throw new Error('error updating user')
      }
      return results[0]
    },
    async incrementUserPoints(id, pointsToAdd) {
      const results = await sql<User[]>`
        update users set points = points + ${pointsToAdd}
        where id = ${id}
        returning *
      `
      if (!results[0]) {
        throw new Error('error incrementing user points')
      }
      return results[0]
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
      const results = await sql<{ rank: number }[]>`
        select (select count(*) from users u2 where u2.points>=u1.points) as rank from users u1 where u1.telegram_id=${input.telegramId} and u1.storacha_space=${input.storachaSpace}
      `
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
        select points from users where users.telegram_id = ${input.telegramId.toString()} and users.storacha_space=${
          input.storachaSpace
        }
      `

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
      const results = await sql<DbJob[]>`
        insert into jobs ${sql(
          // @ts-expect-error Uint8Array is automatically converted to object
          input
        )}
        returning *
      `
      if (!results[0]) {
        throw new Error('error inserting job')
      }
      const job = fromDbJob(results[0])
      await sql.notify(
        results[0].userId,
        stringifyWithUIntArrays({ action: 'add', job })
      )
      return job
    },
    async deleteJob(id, userId) {
      if (!id) return
      await sql<DbJob[]>`
        delete from jobs
        where id = ${id} and user_id = ${userId}
      `
    },
    async getJobByID(id, userId) {
      const results = await sql<DbJob[]>`
        select * from jobs where id = ${id} and user_id = ${userId}
      `
      if (!results[0]) {
        throw new Error('error inserting or locating user')
      }
      return fromDbJob(results[0])
    },
    async getJobsByUserID(id) {
      const dbJobs = await sql<DbJob[]>`
        select * from jobs where user_id = ${id}
      `
      return dbJobs.map(fromDbJob)
    },
    async setJobAsQueued(id) {
      const results = await sql<DbJob[]>`
        update jobs set 
          status = 'queued', 
          progress = ${null}, 
          started_at = ${null}, 
          updated_at = ${new Date()}
        where id = ${id} and status not in ('canceled', 'completed')
        returning *
      `
      if (!results[0]) {
        console.log(`No job found with id ${id} to set as queued`)
      } else {
        console.log(`Job with id ${id} set as queued`)
      }
    },
    async updateJob(id, input) {
      const results = await sql<DbJob[]>`
        update jobs set ${sql(
          // @ts-expect-error Uint8Array is automatically converted to object
          toDbJobParams(input)
        )}
        where id = ${id} and (status != 'canceled' or ${input.status} = 'canceled')
        returning *
      `
      if (!results[0]) {
        throw new Error('error updating job')
      }
      const job = fromDbJob(results[0])
      await sql.notify(
        results[0].userId,
        stringifyWithUIntArrays({ action: 'replace', job })
      )
      return job
    },
    async removeJob(id, userId) {
      const results = await sql<DbJob[]>`
        delete from jobs where id = ${id} and user_id = ${userId} returning *
       `
      if (!results[0]) {
        throw new Error('error removing job')
      }
      await sql.notify(
        results[0].userId,
        stringifyWithUIntArrays({
          action: 'remove',
          job: fromDbJob(results[0]),
        })
      )
    },
    async subscribeToJobUpdates(userId, callback) {
      const result = await sql.listen(userId, (value) => {
        const { action, job } = parseWithUIntArrays(value) as JobEvent
        callback(action, job)
      })
      return result.unlisten
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
        finished: dbJob.finishedAt.getTime(),
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
        started: dbJob.startedAt?.getTime(),
        finished: dbJob.finishedAt.getTime(),
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
        finished: dbJob.finishedAt.getTime(),
        data: dbJob.dataCid,
        points: dbJob.points,
        size: dbJob.size,
      }
  }
}
