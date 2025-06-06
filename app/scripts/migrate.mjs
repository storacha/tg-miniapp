import { fileURLToPath } from 'url'

import { Signer } from '@aws-sdk/rds-signer'
import postgres from 'postgres'
import shift from 'postgres-shift'
import '@dotenvx/dotenvx/config'

const {
  PGHOST,
  PGPORT,
  PGDATABASE,
  PGUSERNAME,
  PGPASSWORD,
  PG_RDS_IAM_AUTH,
  PGSSLMODE,
} = process.env
console.log(PGHOST, PGPORT, PGDATABASE, PGUSERNAME, PG_RDS_IAM_AUTH, PGSSLMODE)

/**
 *
 * @param {string} sslstring
 * @returns {sslstring is 'require' | 'allow' | 'prefer' | 'verify-full'}
 */
const isValidSSLValue = (sslstring) =>
  ['require', 'allow', 'prefer', 'verify-full'].includes(sslstring)
/**
 *
 * @param {string|undefined} sslstring
 */
const validSSLValue = (sslstring) => {
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
        const tk = await signer.getAuthToken()
        return tk
      }
    : PGPASSWORD,
  ssl: validSSLValue(PGSSLMODE),
  idle_timeout: 1,
})

// this is neccesary to make sure ncc picks up the migrations, yet for some reason
// it generates a bad url
const migrationsURL = new URL('migrations', import.meta.url)
shift({
  sql,
  path:
    migrationsURL.protocol === 'file:'
      ? fileURLToPath(migrationsURL)
      : migrationsURL.toString(),
  before: ({ migration_id, name }) => {
    console.log('Migrating', migration_id, name)
  },
})
  .then(() => console.log('All good'))
  .catch((err) => {
    console.error('Failed', err)
    process.exit(1)
  })
