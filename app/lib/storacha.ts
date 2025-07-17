import { Client as StorachaClient } from '@storacha/client'
import { MAX_FREE_BYTES } from './server/constants'

/**
 * Fetches Storacha storage usage for a given space
 * @param client - Storacha client instance
 * @param space - Space DID to get usage for
 * @returns Total storage usage in bytes
 */
export const getStorachaUsage = async (
  client: StorachaClient,
  space: `did:key:${string}`
): Promise<number> => {
  const now = new Date()
  try {
    const usage = await client.capability.usage.report(space, {
      from: new Date(
        now.getUTCFullYear(),
        now.getUTCMonth() - 1,
        now.getUTCDate(),
        0,
        0,
        0,
        0
      ),
      to: now,
    })

    // i don't think we allow people to create or own multiple
    // spaces for now in the TG mini app
    // if it happens in the future, we should account for it.
    return Object.values(usage).reduce(
      (sum, report) => sum + report.size.final,
      0
    )
  } catch (err) {
    console.error('Error while fetching usage report:', err)
    throw new Error(`Failed to fetch usage report.`, { cause: err })
  }
}

export const isPayingAccount = async (client: StorachaClient) => {
  if (!client) throw new Error('Storacha client is not initialized')
  try {
    const account = Object.values(client.accounts())[0]
    if (!account) {
      return false
    }
    const planResult = await account.plan.get()
    if (planResult.error) throw planResult.error
    const plan = planResult.ok
    return plan.product !== 'did:web:trial.storacha.network'
  } catch (error) {
    console.error('Error while checking account plan:', error)
    throw new Error(`Failed to check account plan`, { cause: error })
  }
}

export const isStorageLimitExceeded = async (
  client: StorachaClient,
  usage: number
) => {
  if (await isPayingAccount(client)) {
    return false
  }
  // if the user is not a paying account, we check if they are over the free limit
  return usage > MAX_FREE_BYTES
}
