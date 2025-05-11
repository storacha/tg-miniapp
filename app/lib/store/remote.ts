import { RemoteStorage, UnknownBlock } from '@/api'
import { Client as StorachaClient } from '@storacha/client'
import { UnknownLink } from '@ucanto/client'
import { CARWriterStream } from 'carstream'

const gatewayURL = process.env.NEXT_PUBLIC_STORACHA_GATEWAY_URL || 'https://w3s.link'

class RemoteStore implements RemoteStorage{
  #client: StorachaClient

  constructor(client: StorachaClient) {
    this.#client = client
  }

  async retrieveFile (link: UnknownLink) {
    console.debug('remote store retrieving file...')
    const url = new URL(`/ipfs/${link}`, gatewayURL)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`retrieving file from URL: ${url} status: ${response.status}: ${response.statusText}`);
    }
    const type = response.headers.get('Content-Type') ?? 'application/octet-stream'
    const file = new File([await response.arrayBuffer()], link.toString(), { type })
    console.debug(`remote store retrieved file: ${link}`)
    return file
  }

  async uploadBlocks (blocks: UnknownBlock[]) {
    console.debug(`remote store uploading ${blocks.length} blocks...`)
    const pending = [...blocks]
    const stream = new ReadableStream({
      pull (controller) {
        const block = pending.shift()
        if (!block) {
          controller.close()
          return
        }
        controller.enqueue(block)
      }
    })
    await this.#client.uploadCAR({
      stream: () => stream.pipeThrough(new CARWriterStream())
    })
    console.debug(`remote store uploaded blocks:\n  ${blocks.map(b => b.cid.toString()).join('\n  ')}`)
  }
}

export const create = (client: StorachaClient) => new RemoteStore(client)
