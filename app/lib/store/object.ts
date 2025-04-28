import { Name } from '@storacha/ucn'
import { BlockFetcher, Delegation, Signer, Block } from '@storacha/ucn/api'
import { BlockCodec } from 'multiformats'
import { parse as parseLink } from 'multiformats/link'
import * as dagCBOR from '@ipld/dag-cbor'
import Queue from 'p-queue'
import { ObjectStorage, Cipher, UnknownBlock, RemoteStorage } from '@/api'
import { toAsyncIterable } from '../utils'
import { createEncodeAndEncryptStream, decryptAndDecode } from '../crypto'

export type { BlockFetcher, Signer, Block, Delegation }

export interface Init<T> {
  remoteStore: RemoteStorage
  agent: Signer
  proof: Delegation
  cipher: Cipher
  codec?: BlockCodec<number, T>
}

class Store<T> implements ObjectStorage<T> {
  #queue
  #remoteStore
  #name
  #cipher
  #codec: BlockCodec<number, T>
  #value: T | undefined

  constructor ({ remoteStore, agent, proof, cipher, codec }: Init<T>) {
    this.#queue = new Queue({ concurrency: 1 })
    this.#remoteStore = remoteStore
    this.#name = Name.from(agent, proof)
    this.#cipher = cipher
    this.#codec = codec ?? dagCBOR
  }

  async init (value: T): Promise<void> {
    return this.#queue.add(async () => {
      let root: UnknownBlock|null = null
      const blocks: UnknownBlock[] = []
      for await (const b of toAsyncIterable(createEncodeAndEncryptStream(this.#codec, this.#cipher, value))) {
        blocks.push(b)
        root = b
      }
      if (!root) throw new Error('missing root block')

      const rev = await Name.v0(`/ipfs/${root.cid}`)
      for await (const block of rev.export()) {
        blocks.push(block)
      }
      await this.#remoteStore.uploadBlocks(blocks)
      await Name.publish(this.#name, rev)
      this.#value = value
    })
  }

  async get (): Promise<T> {
    if (this.#value != null) {
      return this.#value
    }
    return this.#queue.add(async () => {
      const current = await Name.resolve(this.#name)
      const link = parseLink<string, T, number, number, 0|1>(current.value.replace('/ipfs/', ''))
      const file = await this.#remoteStore.retrieveFile(link)
      const value = await decryptAndDecode(this.#cipher, this.#codec, new Uint8Array(await file.arrayBuffer()))
      this.#value = value
      return value
    }, { throwOnTimeout: true })
  }

  async set (value: T): Promise<void> {
    return this.#queue.add(async () => {
      let root: UnknownBlock|null = null
      const blocks: UnknownBlock[] = []
      for await (const b of toAsyncIterable(createEncodeAndEncryptStream(this.#codec, this.#cipher, value))) {
        blocks.push(b)
        root = b
      }
      if (!root) throw new Error('missing root block')

      const current = await Name.resolve(this.#name)
      const rev = await Name.increment(current, `/ipfs/${root.cid}`)
      for await (const block of rev.export()) {
        blocks.push(block)
      }
      await this.#remoteStore.uploadBlocks(blocks)
      await Name.publish(this.#name, rev)
      this.#value = value
    }, { throwOnTimeout: true })
  }
}

export const create = <T>(init: Init<T>) => new Store(init)
