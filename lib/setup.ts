import { getMasterKeyFile } from "@/lib/encryption"

function isPlaceholderMasterKey(key: string) {
  return key.includes("change-this") || key.includes("super-secret")
}

function isConfiguredMasterKey(key: string | null | undefined) {
  if (!key) {
    return false
  }

  return key.length >= 32 && !isPlaceholderMasterKey(key)
}

export function isSetupRequired(): boolean {
  return (
    !isConfiguredMasterKey(process.env.KOSH_MASTER_KEY) &&
    !isConfiguredMasterKey(getMasterKeyFile())
  )
}
