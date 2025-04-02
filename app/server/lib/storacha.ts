import * as Client from '@web3-storage/w3up-client'
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory'
import getConfig from './config'

let client: Client.Client | null = null

export async function getStorachaClient() {
	if (!client) {
		client = await Client.create()

		try {
			const email = process.env.STORACHA_EMAIL || 'test@example.com'
			await client.login(`${email}@web3.storage`)

			if (process.env.STORACHA_SPACE_DID) {
				const spaceDid = process.env.STORACHA_SPACE_DID
				if (spaceDid.startsWith('did:')) {
					await client.setCurrentSpace(spaceDid as `did:${string}:${string}`)
				}
			}
		} catch (error) {
			console.warn('Storacha client setup failed:', error)
			if (process.env.NODE_ENV !== 'development') {
				throw error
			}
		}
	}

	return client
}

export async function uploadToStoracha(content: string, filename: string): Promise<string | null> {
	try {
		const client = await getStorachaClient()

		const blob = new Blob([content], { type: 'text/plain' })
		const file = new File([blob], filename)

		const cid = await client.uploadFile(file)

		return cid.toString()
	} catch (error) {
		console.error('Error uploading to Storacha:', error)
		if (process.env.NODE_ENV !== 'development') {
			throw error
		}
		return null
	}
}

export function calculatePoints(sizeInBytes: number): number {
	const sizeInKB = sizeInBytes / 1024
	return Math.floor(sizeInKB / 10)
}
