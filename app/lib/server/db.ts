import postgres from 'postgres'
import { Signer } from '@aws-sdk/rds-signer'
import { Ranking } from '@/api'

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
  types: {
    bigint: postgres.BigInt
  }
})

export interface User {
  id: string
  telegramId: bigint
  storachaSpace: string
  points: number
  createdAt: string
} 

type Input<
  T,
  NoInput extends keyof T,
  OptionalInput extends keyof T = never,
> = Omit<Omit<T, NoInput>, OptionalInput> &
  Partial<Omit<Pick<T, OptionalInput>, NoInput>>

type UserInput = Input<User, 'id' | 'createdAt' | 'points'>

export interface TGDatabase {
  findOrCreateUser(input: UserInput) : Promise<User>
  updateUser(id: string, input: User) : Promise<User>
  leaderboard() : Promise<User[]>
  rank(telegramId: bigint) : Promise<Ranking | undefined>
}

export function getDB() : TGDatabase {
  return {
    async findOrCreateUser(input) {
      console.log("pg vars", PGHOST, PGPORT, PGDATABASE, PGUSERNAME, PG_RDS_IAM_AUTH, PGSSLMODE)

      const results = await sql<User[]>`
        insert into users ${sql(input)} on conflict do nothing
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
    async leaderboard() {
      return await sql<User[]>`
        select * from users
        order by points desc
        limit 100
      `
    },
    async rank(telegramId: bigint) {
      const results = await sql<{rank : number}[]>`
        select (select count(*) from users u2 where u2.points>=u1.points) as rank from users u1 where u1.telegram_id=${telegramId}
      `
      if (!results[0]) {
        return undefined
      }
      
      const totals = await sql<{ total: number}[]>`
        select count(*) as total from users
      `
      
      if (!totals[0]) {
        throw new Error("error getting total")
      }
      return {
        rank: results[0].rank,
        percentile: (results[0].rank*100)/(totals[0].total)
      }
    }
  }
}