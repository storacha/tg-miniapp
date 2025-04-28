import { RemoteStorage, UnknownBlock } from '@/api'
import { Client as StorachaClient, UnknownLink } from '@storacha/ui-react'
import { CARWriterStream } from 'carstream'

const gatewayURL = process.env.NEXT_PUBLIC_STORACHA_GATEWAY_URL || 'https://w3s.link'

class RemoteStore implements RemoteStorage{
  #client: StorachaClient

  constructor(client: StorachaClient) {
    this.#client = client
  }

  async retrieveFile (link: UnknownLink) {
    const url = new URL(`/ipfs/${link}`, gatewayURL)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`retrieving file from URL: ${url} status: ${response.status}: ${response.statusText}`);
    }
    const type = response.headers.get('Content-Type') ?? 'application/octet-stream'
    return new File([await response.arrayBuffer()], link.toString(), { type })
  }

  async uploadBlocks (blocks: UnknownBlock[]) {
    const stream = new ReadableStream({
      pull (controller) {
        const block = blocks.shift()
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
  }
}

export const create = (client: StorachaClient) => new RemoteStore(client)
