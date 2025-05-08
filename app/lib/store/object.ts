import { Name, NoValueError } from '@storacha/ucn'
import { NameView } from '@storacha/ucn/api'
import { BlockCodec } from 'multiformats'
import { parse as parseLink } from 'multiformats/link'
import * as dagCBOR from '@ipld/dag-cbor'
import Queue from 'p-queue'
import { ObjectStorage, Cipher, UnknownBlock, RemoteStorage } from '@/api'
import { toAsyncIterable } from '../utils'
import { createEncodeAndEncryptStream, decryptAndDecode } from '../crypto'

export interface Init<T> {
  remoteStore: RemoteStorage
  name: NameView
  cipher: Cipher
  codec?: BlockCodec<number, T>
}

class Store<T> implements ObjectStorage<T> {
  #queue
  #remoteStore
  #name
  #cipher
  #codec: BlockCodec<number, T>

  constructor ({ remoteStore, name, cipher, codec }: Init<T>) {
    this.#queue = new Queue({ concurrency: 1 })
    this.#remoteStore = remoteStore
    this.#name = name
    this.#cipher = cipher
    this.#codec = codec ?? dagCBOR
  }

  async init (value: T): Promise<void> {
    await this.#queue.add(async () => {
      console.debug('object store initializing...')
      try {
        const { value } = await Name.resolve(this.#name)
        console.debug(`object store is already initialized with value: ${value}`)
        return
      } catch (err) {
        // only initialize if no value is known, throw for other errors
        if (!(err instanceof NoValueError)) {
          throw err
        }
      }

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
      console.debug(`object store initialized with value: ${value}`)
    })
  }

  async get (): Promise<T> {

    const value = await this.#queue.add(async () => {
      console.debug('object store getting current value...')
      const current = await Name.resolve(this.#name)
      const link = parseLink<string, T, number, number, 0|1>(current.value.replace('/ipfs/', ''))
      const file = await this.#remoteStore.retrieveFile(link)
      const value = await decryptAndDecode(this.#cipher, this.#codec, new Uint8Array(await file.arrayBuffer()))
      console.debug(`object store got current value: ${current.value}`)
      return value
    }, { throwOnTimeout: true })
    return value
  }

  async set (value: T): Promise<void> {
    await this.#queue.add(async () => {
      console.debug('object store setting current value...')
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
      console.debug(`object store set current value: ${rev.value}`)
    }, { throwOnTimeout: true })
  }
}

export const create = <T>(init: Init<T>) => new Store(init)
