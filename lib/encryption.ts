import CryptoJS from "crypto-js"
import * as fs from "fs"
import * as path from "path"

export const MIN_MASTER_KEY_LENGTH = 12
const MASTER_KEY_FILE = path.join(process.cwd(), "data", "master.key")

export function validateMasterKey(key: string): boolean {
  return key.length >= MIN_MASTER_KEY_LENGTH
}

export function getMasterKeyFile(): string | null {
  try {
    if (fs.existsSync(MASTER_KEY_FILE)) {
      return fs.readFileSync(MASTER_KEY_FILE, "utf-8").trim()
    }
  } catch {
    // Ignore errors
  }
  return null
}

export function setMasterKeyFile(key: string): void {
  const dir = path.dirname(MASTER_KEY_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(MASTER_KEY_FILE, key, "utf-8")
}

export function getMasterKey(): string {
  const fileKey = getMasterKeyFile()
  if (fileKey) return fileKey
  
  const secret = process.env.KOSH_MASTER_KEY
  if (!secret) throw new Error("KOSH_MASTER_KEY is not set")
  return secret
}

const getSecret = () => getMasterKey()

export function encrypt(plainText: string): string {
  return CryptoJS.AES.encrypt(plainText, getSecret()).toString()
}

export function decrypt(cipherText: string): string {
  const bytes = CryptoJS.AES.decrypt(cipherText, getSecret())
  return bytes.toString(CryptoJS.enc.Utf8)
}

export function encryptWithKey(plainText: string, key: string): string {
  return CryptoJS.AES.encrypt(plainText, key).toString()
}

export function decryptWithKey(cipherText: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(cipherText, key)
  return bytes.toString(CryptoJS.enc.Utf8)
}