import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'crypto'
import getConfig from './config'

const config = getConfig()

// Centralized encryption parameters
const ENCRYPTION_CONFIG = {
    algorithm: 'aes-256-cbc',
    iterations: 10000, // PBKDF2 iterations
    keyLength: 32, // AES-256 key length
    ivLength: 16, // AES IV length
    saltLength: 16, // Salt length
}

/**
 * Encrypts the given content using AES-256-CBC.
 * @param content - The content to encrypt.
 * @returns A base64-encoded string containing the salt and encrypted data.
 */
export function encryptContent(content: string): string {
    try {
        const salt = randomBytes(ENCRYPTION_CONFIG.saltLength)
        const { key, iv } = deriveKeyAndIV(config.ENCRYPT_KEY, salt)
        const cipher = createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv)

        const encryptedData = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()])
        const result = Buffer.concat([salt, encryptedData])

        return result.toString('base64')
    } catch (err) {
        console.error('Error during encryption:', err)
        throw new Error('Encryption failed')
    }
}

/**
 * Decrypts the given encrypted content using AES-256-CBC.
 * @param encryptedContent - A base64-encoded string containing the salt and encrypted data.
 * @returns The decrypted content as a string.
 */
export function decryptContent(encryptedContent: string): string {
    try {
     
        const encryptedBuffer = Buffer.from(encryptedContent, 'base64')

        const salt = encryptedBuffer.subarray(0, ENCRYPTION_CONFIG.saltLength)
        const encryptedData = encryptedBuffer.subarray(ENCRYPTION_CONFIG.saltLength)
        const { key, iv } = deriveKeyAndIV(config.ENCRYPT_KEY, salt)

        const decipher = createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, iv)

        const decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()])

        return decryptedData.toString('utf8')
    } catch (err) {
        console.error('Error during decryption:', err)
        throw new Error('Decryption failed')
    }
}

/**
 * Derives a key and IV from the given password and salt using PBKDF2.
 * @param password - The password to derive the key and IV from.
 * @param salt - The salt to use for key derivation.
 * @returns An object containing the derived key and IV.
 */
function deriveKeyAndIV(password: string, salt: Uint8Array) {
    const key = pbkdf2Sync(password, salt, ENCRYPTION_CONFIG.iterations, ENCRYPTION_CONFIG.keyLength, 'sha256')
    const iv = key.subarray(0, ENCRYPTION_CONFIG.ivLength)
    return { key, iv }
}