import CryptoJS from "crypto-js"

const getSecret = () => {
  const secret = process.env.KOSH_MASTER_KEY
  if (!secret) throw new Error("KOSH_MASTER_KEY is not set in .env")
  return secret
}

export function encrypt(plainText: string): string {
  return CryptoJS.AES.encrypt(plainText, getSecret()).toString()
}

export function decrypt(cipherText: string): string {
  const bytes = CryptoJS.AES.decrypt(cipherText, getSecret())
  return bytes.toString(CryptoJS.enc.Utf8)
}