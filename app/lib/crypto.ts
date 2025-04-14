import { base64 } from 'multiformats/bases/base64'

// Centralized encryption parameters
const ENCRYPTION_CONFIG = {
    algorithm: 'AES-CBC',
    iterations: 10000, // PBKDF2 iterations
    keyLength: 256 / 8, // AES-256 key length in bytes
    ivLength: 16, // AES IV length
    saltLength: 16, // Salt length
}

/**
 * Encrypts the given content using AES-CBC.
 * @param content - The content to encrypt.
 * @param password - The password to derive the encryption key.
 * @returns A base64-encoded string containing the salt and encrypted data.
 */
export async function encryptContent(content: string, password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.saltLength))
    const { key, iv } = await deriveKeyAndIV(password, salt)

    const encoder = new TextEncoder()
    const data = encoder.encode(content)

    const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-CBC', iv },
        key,
        data
    )

    const result = new Uint8Array(salt.length + encryptedData.byteLength)
    result.set(salt)
    result.set(new Uint8Array(encryptedData), salt.length)

    return base64.encode(result)
}

/**
 * Decrypts the given encrypted content using AES-CBC.
 * @param encryptedContent - A base64-encoded string containing the salt and encrypted data.
 * @param password - The password to derive the decryption key.
 * @returns The decrypted content as a string.
 */
export async function decryptContent(encryptedContent: string, password: string): Promise<string> {
    const encryptedKeyData = base64.decode(encryptedContent)

    const salt = encryptedKeyData.subarray(0, ENCRYPTION_CONFIG.saltLength)
    const encryptedData = encryptedKeyData.subarray(ENCRYPTION_CONFIG.saltLength)
    const { key, iv } = await deriveKeyAndIV(password, salt)

    const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv },
        key,
        encryptedData
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedData)
}

/**
 * Derives a key and IV from the given password and salt using PBKDF2.
 * @param password - The password to derive the key and IV from.
 * @param salt - The salt to use for key derivation.
 * @returns An object containing the derived key and IV.
 */
async function deriveKeyAndIV(password: string, salt: Uint8Array) {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    )

    const derivedKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: ENCRYPTION_CONFIG.iterations,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-CBC', length: ENCRYPTION_CONFIG.keyLength * 8 },
        true,
        ['encrypt', 'decrypt']
    )

    const rawKey = await crypto.subtle.exportKey('raw', derivedKey)
    const iv = new Uint8Array(rawKey).subarray(0, ENCRYPTION_CONFIG.ivLength)

    return { key: derivedKey, iv }
}
/**
 * Generates a random password with the specified length.
 * @param length - The length of the password to generate.
 * @returns A randomly generated password.
 */
export function generateRandomPassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?'
    const password = Array.from(crypto.getRandomValues(new Uint8Array(length)))
        .map((value) => charset[value % charset.length])
        .join('')
    return password
}
