import { randomBytes } from "crypto"
import { readFile, writeFile, mkdir } from "fs/promises"
import path from "path"
import { execSync } from "child_process"

const rootDir = process.cwd()
const envPath = path.join(rootDir, ".env")
const envExamplePath = path.join(rootDir, ".env.example")
const dataDir = path.join(rootDir, "data")
const masterKeyPath = path.join(dataDir, "master.key")
const databaseUrl = "file:./kosh.db"

function normalizeNewlines(value) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
}

function updateEnvContents(contents, masterKey) {
  const normalized = normalizeNewlines(contents)
  const lines = normalized.split("\n")
  const nextLines = []
  let hasDatabaseUrl = false
  let hasMasterKey = false

  for (const line of lines) {
    if (!line.trim()) {
      nextLines.push(line)
      continue
    }

    if (/^\s*DATABASE_URL\s*=/.test(line)) {
      nextLines.push(`DATABASE_URL=${databaseUrl}`)
      hasDatabaseUrl = true
      continue
    }

    if (/^\s*KOSH_MASTER_KEY\s*=/.test(line)) {
      nextLines.push(`KOSH_MASTER_KEY=${masterKey}`)
      hasMasterKey = true
      continue
    }

    nextLines.push(line)
  }

  if (!hasDatabaseUrl) {
    nextLines.push(`DATABASE_URL=${databaseUrl}`)
  }

  if (!hasMasterKey) {
    nextLines.push(`KOSH_MASTER_KEY=${masterKey}`)
  }

  while (nextLines.length > 0 && nextLines[nextLines.length - 1] === "") {
    nextLines.pop()
  }

  return `${nextLines.join("\n")}\n`
}

function extractMasterKeyFromEnv(contents) {
  const match = contents.match(/^\s*KOSH_MASTER_KEY\s*=\s*(.+)\s*$/m)

  if (!match) {
    return null
  }

  return match[1].trim().replace(/^["']|["']$/g, "")
}

async function main() {
  await mkdir(dataDir, { recursive: true })

  let masterKey = null

  try {
    const existingEnv = await readFile(envPath, "utf8")
    masterKey = extractMasterKeyFromEnv(existingEnv)
  } catch {
    masterKey = null
  }

  if (!masterKey) {
    try {
      const existingMasterKey = await readFile(masterKeyPath, "utf8")
      masterKey = existingMasterKey.trim() || null
    } catch {
      masterKey = null
    }
  }

  if (!masterKey) {
    masterKey = randomBytes(32).toString("hex")
  }

  await writeFile(masterKeyPath, `${masterKey}\n`, "utf8")
  await writeFile(envPath, await buildEnvFile(masterKey), "utf8")

  execSync("npm run db:generate", { stdio: "inherit" })
  execSync("npm run db:deploy", { stdio: "inherit" })

  console.log(`Bootstrap complete. Master key stored at ${masterKeyPath}`)
}

async function buildEnvFile(masterKey) {
  try {
    const existingEnv = await readFile(envPath, "utf8")
    return updateEnvContents(existingEnv, masterKey)
  } catch {
    try {
      const example = await readFile(envExamplePath, "utf8")
      const withKey = normalizeNewlines(example)
        .replace(/KOSH_MASTER_KEY=.*$/m, `KOSH_MASTER_KEY=${masterKey}`)
        .replace(/DATABASE_URL=.*$/m, `DATABASE_URL=${databaseUrl}`)

      return `${withKey.trimEnd()}\n`
    } catch {
      return `DATABASE_URL=${databaseUrl}\nKOSH_MASTER_KEY=${masterKey}\n`
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
