import { decryptContent, encryptContent } from './crypto'
import type { Encrypter, Decrypter, ByteView, EncryptedByteView } from '@/api'

class Cipher implements Encrypter, Decrypter {
  #password

  constructor(password: string) {
    this.#password = password
  }

  async encrypt<T>(data: ByteView<T>): Promise<EncryptedByteView<T>> {
    return encryptContent(data, this.#password)
  }

  async decrypt<T>(data: EncryptedByteView<T>): Promise<ByteView<T>> {
    return decryptContent(data, this.#password)
  }
}

export const create = (password: string) => new Cipher(password)
