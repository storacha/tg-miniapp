import { delegate } from '@ucanto/core'
import { Principal } from '@ipld/dag-ucan'
import * as Plan from '@storacha/capabilities/plan'
import * as Usage from '@storacha/capabilities/usage'
import * as Upload from '@storacha/capabilities/upload'
import * as SSstore from '@storacha/capabilities/store'
import * as Filecoin from '@storacha/capabilities/filecoin'
import * as SpaceBlob from '@storacha/capabilities/space/blob'
import * as SpaceIndex from '@storacha/capabilities/space/index'
import { Client as StorachaClient } from '@storacha/client'
import { MAX_FREE_BYTES } from './server/constants'
import { AccountDID } from '@storacha/access'

// default to 1 hour
const defaultDuration = 1000 * 60 * 60
const STORACHA_TRIAL_PLAN = 'did:web:trial.storacha.network'

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

export const isPayingAccount = async (
  client: StorachaClient,
  accountDID?: AccountDID
) => {
  if (!client) throw new Error('Storacha client is not initialized')
  try {
    const account = Object.values(client.accounts())[0]

    let planResult
    if (account) {
      planResult = await account.plan.get()
    } else if (accountDID) {
      const proofs = client.proofs([
        {
          can: 'plan/get',
          with: accountDID,
        },
      ])

      const receipt = await client.agent.invokeAndExecute(Plan.get, {
        with: accountDID,
        proofs,
      })
      planResult = receipt.out
    } else {
      throw new Error('No account or accountDID provided to check plan')
    }
    if (planResult.error) throw planResult.error
    const plan = planResult.ok
    return plan.product !== STORACHA_TRIAL_PLAN
  } catch (error) {
    console.error('Error while checking account plan:', error)
    throw new Error(`Failed to check account plan`, { cause: error })
  }
}

export const isStorageLimitExceeded = async (
  client: StorachaClient,
  usage: number,
  accountDID?: AccountDID
) => {
  if (await isPayingAccount(client, accountDID)) {
    return false
  }
  // if the user is not a paying account, we check if they are over the free limit
  return usage > MAX_FREE_BYTES
}

export const createServerDelegations = async (
  client: StorachaClient,
  audienceDID: Principal,
  accountDID: AccountDID
) => {
  const space = client.currentSpace()
  if (!space) {
    throw new Error('No space found!')
  }

  const delegation = await delegate({
    issuer: client.agent.issuer,
    audience: audienceDID,
    capabilities: [
      { can: SpaceBlob.add.can, with: space.did() },
      { can: SpaceBlob.remove.can, with: space.did() },
      { can: SpaceIndex.add.can, with: space.did() },
      { can: Upload.add.can, with: space.did() },
      { can: Upload.remove.can, with: space.did() },
      { can: SSstore.remove.can, with: space.did() },
      { can: Filecoin.offer.can, with: space.did() },
      { can: Usage.report.can, with: space.did() },
      { can: Plan.get.can, with: accountDID },
    ],
    proofs: client.proofs(),
    expiration: new Date(Date.now() + defaultDuration).getTime(),
  })

  const result = await delegation.archive()

  if (result.error) {
    throw result.error
  }
  return result.ok
}
