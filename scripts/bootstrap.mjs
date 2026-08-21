import { randomBytes } from "crypto"
import { readFile, writeFile, mkdir } from "fs/promises"
import { existsSync, copyFileSync, readdirSync, statSync } from "fs"
import path from "path"
import os from "os"
import { execSync } from "child_process"

const rootDir = process.env.KOSH_HOME || process.cwd()
const envPath = path.join(rootDir, ".env")
const envExamplePath = path.join(process.cwd(), ".env.example")
const dataDir = path.join(rootDir, "data")
const masterKeyPath = path.join(dataDir, "master.key")
// Absolute DB path under KOSH_HOME so the CLI install keeps its database
// outside the npm package dir; relative ./kosh.db preserved for dev/Docker.
const toPosix = (p) => p.split(path.sep).join("/")
const databaseUrl = process.env.KOSH_HOME
  ? `file:${toPosix(path.join(rootDir, "kosh.db"))}`
  : "file:./kosh.db"
const gatewayDataDir = path.join(dataDir, "gateway")
const gatewayDbDir = path.join(gatewayDataDir, "db")
const gatewayDbPath = path.join(gatewayDbDir, "data.sqlite")

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

async function initGatewayDatabase() {
  await mkdir(gatewayDbDir, { recursive: true })

  // 1. Auto-migrate existing AppData or legacy database if target doesn't exist yet
  if (!existsSync(gatewayDbPath)) {
    const appDataDir = process.platform === "win32"
      ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "kosh", "gateway", "db")
      : path.join(os.homedir(), ".kosh", "gateway", "db")

    const legacy9routerDir = process.platform === "win32"
      ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "9router", "db")
      : path.join(os.homedir(), ".9router", "db")

    const sourceDbDir = existsSync(path.join(appDataDir, "data.sqlite"))
      ? appDataDir
      : existsSync(path.join(legacy9routerDir, "data.sqlite"))
        ? legacy9routerDir
        : null

    if (sourceDbDir) {
      try {
        const files = readdirSync(sourceDbDir)
        for (const file of files) {
          const src = path.join(sourceDbDir, file)
          const dst = path.join(gatewayDbDir, file)
          if (statSync(src).isFile()) {
            copyFileSync(src, dst)
          }
        }
        console.log(`[Gateway DB] Migrated existing database from ${sourceDbDir} -> ${gatewayDbPath}`)
      } catch (err) {
        console.warn(`[Gateway DB] Migration warning: ${err.message}`)
      }
    }
  }

  // 2. Ensure SQLite schema and tables are created
  try {
    const sqlite = await import("node:sqlite")
    const db = new sqlite.DatabaseSync(gatewayDbPath)

    // Execute standard schema initialization
    db.exec(`
      CREATE TABLE IF NOT EXISTS _meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL,
        createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS providerConnections (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        authType TEXT,
        name TEXT,
        email TEXT,
        priority INTEGER DEFAULT 1,
        isActive INTEGER DEFAULT 1,
        data TEXT,
        createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS providerNodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS proxyPools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        protocol TEXT DEFAULT 'http',
        enabled INTEGER DEFAULT 1,
        autoRotate INTEGER DEFAULT 0,
        rotateInterval INTEGER DEFAULT 0,
        strategy TEXT DEFAULT 'round-robin',
        urls TEXT,
        proxies TEXT,
        auth TEXT,
        customHeaders TEXT,
        createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS apiKeys (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        machineId TEXT,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS combos (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        models TEXT NOT NULL,
        createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS usageHistory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        model TEXT NOT NULL,
        provider TEXT NOT NULL,
        connectionId TEXT,
        connectionName TEXT,
        inputTokens INTEGER NOT NULL,
        outputTokens INTEGER NOT NULL,
        status TEXT NOT NULL,
        requestDetailsId INTEGER
      );

      CREATE TABLE IF NOT EXISTS usageDaily (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        model TEXT NOT NULL,
        provider TEXT NOT NULL,
        connectionId TEXT,
        connectionName TEXT,
        inputTokens INTEGER NOT NULL,
        outputTokens INTEGER NOT NULL,
        requests INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS requestDetails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        body TEXT,
        createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
    `)

    // Ensure a default Gateway key exists if empty
    const keyCount = db.prepare("SELECT count(*) as count FROM apiKeys").get()?.count || 0
    if (keyCount === 0) {
      const defaultKey = `sk-${randomBytes(8).toString("hex")}-${randomBytes(3).toString("hex")}-${randomBytes(4).toString("hex")}`
      db.prepare("INSERT INTO apiKeys (id, key, name, machineId, isActive) VALUES (?, ?, ?, ?, 1)").run(
        randomBytes(16).toString("hex"),
        defaultKey,
        "Default Key",
        randomBytes(8).toString("hex")
      )
    }

    db.close()
    console.log(`[Gateway DB] Initialized SQLite schema at ${gatewayDbPath}`)
  } catch (err) {
    console.warn(`[Gateway DB] SQLite init note: ${err.message}`)
  }
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

  // Step 1: Kosh Vault & Pulse Prisma DB
  console.log("\n--- [1/3] Initializing Kosh Vault & Pulse Database (Prisma) ---")
  // Prisma CLI reads .env from cwd/schema dir; with KOSH_HOME relocation the
  // .env lives elsewhere, so pass the resolved URL explicitly.
  const dbEnv = { ...process.env, DATABASE_URL: databaseUrl }
  execSync("npm run db:generate", { stdio: "inherit", env: dbEnv })
  execSync("npm run db:deploy", { stdio: "inherit", env: dbEnv })

  // Step 2: Kosh Gateway DB
  console.log("\n--- [2/3] Initializing Kosh Gateway Database (SQLite) ---")
  await initGatewayDatabase()

  // Step 3: Provider OAuth credentials (best-effort auto-detection)
  console.log("\n--- [3/3] Resolving provider OAuth credentials ---")
  try {
    const { ensureDetected } = await import("../open-sse/shared/providerCredsNode.js")
    const results = await ensureDetected()
    for (const [provider, status] of Object.entries(results)) {
      console.log(`  - ${provider}: ${status}`)
    }
  } catch (err) {
    console.warn(`[Provider creds] detection skipped: ${err?.message || err}`)
  }

  console.log(`\n✓ Bootstrap complete! All databases and keys are ready.`)
  console.log(`  - Master Key:       ${masterKeyPath}`)
  console.log(`  - Vault DB:         ./prisma/kosh.db`)
  console.log(`  - Gateway DB:       ${gatewayDbPath}\n`)
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
