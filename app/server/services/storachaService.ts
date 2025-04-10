import * as Client from '@storacha/client'
import { ed25519 } from '@ucanto/principal'
import { Capabilities, Delegation as DelegationType } from '@ucanto/interface'
import { importDAG } from '@ucanto/core/delegation'
import getConfig from '../lib/config'
import * as Crypto from '../lib/crypto'
import * as BackupService from './backupService'
import { CarReader } from '@ipld/car'
import { serviceConf, receiptsEndpoint } from '../config/storachaConfig'

const config = getConfig()

const principal = ed25519.parse(config.SERVER_PRINCIPAL)
const identity = principal.withDID(
	'did:web:telegram.storacha.network'
  )

export async function parseProof(data: string) {
	const blocks = []
	const reader = await CarReader.fromBytes(new Uint8Array(Buffer.from(data, 'base64')))
	for await (const block of reader.blocks()) {
		blocks.push(block)
	}
	// @ts-ignore
	return importDAG(blocks)
}

// TODO
// @ts-expect-error: Function without implementation
async function getProof(userId: string): Promise<DelegationType<Capabilities>>{}

// TODO:
export async function authorizeServer(account: `did:${string}:${string}`, proof: DelegationType<Capabilities>): Promise<void> {}

// TODO: this is a temporary solution
export async function getStorachaClient(userId: string) {
	const client = await Client.create({ principal, serviceConf, receiptsEndpoint})
	const proof = await getProof(userId)
	const space = await client.addSpace(proof)
  	await client.setCurrentSpace(space.did())
	return client
}

export async function uploadToStoracha(userId: string, content: string) {
	try {
		const client = await getStorachaClient(userId)
		const space = client.currentSpace()?.did()!

		const ecryptedContent = Crypto.encryptContent(content)

		const blob = new Blob([ecryptedContent], { type: 'text/plain' })
		const size = blob.size
		const points = calculatePoints(size)

		const cid = await client.uploadFile(blob)

		console.log('Uploaded to Storacha:', cid)

		const backup = await BackupService.registerBackup({
			userTelegramId: userId,
			cid: cid.toString(),
			space,
			size,
			points,
		})

		console.log('Backup registered:', backup._id)

		// TODO: update leaderboard

		return {cid: cid.toString(), points}
	} catch (err) {
		console.error('Error uploading to Storacha:', err)
		throw err
	}
}


export function calculatePoints(sizeInBytes: number): number {
	return sizeInBytes * config.POINTS_PER_BYTE
}
