import { decryptContent, encryptContent } from './crypto'

class Cipher {
  #password

  constructor(password: string) {
    this.#password = password
  }

  encrypt(data: Uint8Array): Promise<Uint8Array> {
    return encryptContent(data, this.#password)
  }

  decrypt(data: Uint8Array): Promise<Uint8Array> {
    return decryptContent(data, this.#password)
  }
}

export const create = (password: string) => new Cipher(password)
