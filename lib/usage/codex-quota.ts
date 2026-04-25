import { createHash } from "crypto"
import { existsSync } from "fs"
import { readFile } from "fs/promises"
import path from "path"
import { spawn } from "child_process"

import {
  recordQuotaSnapshot,
  type QuotaSnapshotInput,
  type QuotaWindowInput,
} from "@/lib/usage/quota"

type AuthJson = Record<string, unknown>

type CodexQuotaRefreshOptions = {
  allowNetwork?: boolean
  allowCliFallback?: boolean
  authPath?: string | null
}

const CODEX_USAGE_URL = "https://chatgpt.com/backend-api/wham/usage"

function toNumber(value: unknown) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

function toDate(value: unknown, baseDate = new Date()) {
  if (!value) return null

  if (typeof value === "number") {
    const date =
      value > 1_000_000_000
        ? new Date(value > 10_000_000_000 ? value : value * 1000)
        : new Date(baseDate.getTime() + value * 1000)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value === "string") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  return null
}

function getDefaultCodexHome() {
  const home = process.env.CODEX_HOME ?? process.env.HOME ?? process.env.USERPROFILE

  if (!home) {
    throw new Error("Unable to resolve Codex home directory")
  }

  return process.env.CODEX_HOME
    ? path.resolve(/*turbopackIgnore: true*/ home)
    : path.join(/*turbopackIgnore: true*/ home, ".codex")
}

function getAuthPath(inputPath?: string | null) {
  return inputPath
    ? path.resolve(/*turbopackIgnore: true*/ inputPath)
    : path.join(/*turbopackIgnore: true*/ getDefaultCodexHome(), "auth.json")
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".")

  if (!payload) return null

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    )

    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<
      string,
      unknown
    >
  } catch {
    return null
  }
}

function walkValues(value: unknown, visitor: (key: string, value: unknown) => void) {
  function visit(current: unknown, key = "") {
    visitor(key, current)

    if (!current || typeof current !== "object") {
      return
    }

    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, String(index)))
      return
    }

    Object.entries(current as Record<string, unknown>).forEach(([entryKey, entryValue]) =>
      visit(entryValue, entryKey)
    )
  }

  visit(value)
}

function findAccessToken(auth: AuthJson) {
  let bestToken: string | null = null

  walkValues(auth, (key, value) => {
    if (bestToken || typeof value !== "string") return

    const normalizedKey = key.toLowerCase()
    const looksLikeAccessKey =
      normalizedKey.includes("access") || normalizedKey === "token"
    const looksLikeJwt = value.split(".").length === 3

    if (looksLikeAccessKey && looksLikeJwt) {
      bestToken = value
    }
  })

  return bestToken
}

function findIdentity(auth: AuthJson, accessToken: string | null) {
  const jwtPayload = accessToken ? decodeJwtPayload(accessToken) : null
  const identity = {
    email: null as string | null,
    plan: null as string | null,
  }

  walkValues({ auth, jwtPayload }, (key, value) => {
    if (typeof value !== "string") return

    const normalizedKey = key.toLowerCase()
    if (!identity.email && normalizedKey.includes("email") && value.includes("@")) {
      identity.email = value
    }

    if (
      !identity.plan &&
      (normalizedKey.includes("plan") ||
        normalizedKey.includes("account") ||
        normalizedKey.includes("tier"))
    ) {
      identity.plan = value
    }
  })

  return identity
}

async function readAuth(authPath: string) {
  if (!existsSync(/*turbopackIgnore: true*/ authPath)) {
    return null
  }

  const content = await readFile(/*turbopackIgnore: true*/ authPath, "utf8")
  return JSON.parse(content) as AuthJson
}

function findNumericByKeys(payload: unknown, keys: string[]) {
  let found: number | null = null

  walkValues(payload, (key, value) => {
    if (found !== null) return

    const normalized = key.toLowerCase()
    if (keys.some((candidate) => normalized.includes(candidate))) {
      found = toNumber(value)
    }
  })

  return found
}

function findDateByKeys(payload: unknown, keys: string[], baseDate = new Date()) {
  let found: Date | null = null

  walkValues(payload, (key, value) => {
    if (found) return

    const normalized = key.toLowerCase()
    if (keys.some((candidate) => normalized.includes(candidate))) {
      found = toDate(value, baseDate)
    }
  })

  return found
}

function parseWindowFromObject(
  payload: unknown,
  hints: string[],
  fallbackMinutes: number,
  fetchedAt = new Date()
): QuotaWindowInput | null {
  let candidate: unknown = null

  walkValues(payload, (key, value) => {
    if (candidate || !value || typeof value !== "object") return

    const normalizedKey = key.toLowerCase()
    if (hints.some((hint) => normalizedKey.includes(hint))) {
      candidate = value
    }
  })

  const source = candidate ?? payload
  const usedPercent = findNumericByKeys(source, [
    "usedpercent",
    "used_percent",
    "usagepercent",
    "usage_percent",
    "percent",
  ])
  const resetsAt = findDateByKeys(source, ["resetsat", "resets_at", "reset"], fetchedAt)

  if (usedPercent === null && !resetsAt) {
    return null
  }

  const resetDate = resetsAt as Date | null

  return {
    usedPercent,
    windowMinutes: fallbackMinutes,
    resetsAt: resetDate,
    resetDescription: resetDate ? `Resets ${resetDate.toLocaleString()}` : null,
  }
}

function parseCredits(payload: unknown) {
  const creditsRemaining = findNumericByKeys(payload, [
    "creditsremaining",
    "credits_remaining",
    "remainingcredits",
    "balance",
  ])

  return {
    creditsRemaining,
    hasCredits: creditsRemaining !== null ? creditsRemaining > 0 : null,
  }
}

async function fetchOAuthQuota(accessToken: string) {
  const response = await fetch(CODEX_USAGE_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Codex OAuth usage request failed (${response.status})`)
  }

  return response.json() as Promise<unknown>
}

function parseOAuthPayload(payload: unknown) {
  const fetchedAt = new Date()
  const primary = parseWindowFromObject(
    payload,
    ["5h", "five", "session", "primary"],
    300,
    fetchedAt
  )
  const secondary = parseWindowFromObject(
    payload,
    ["weekly", "week", "secondary"],
    10_080,
    fetchedAt
  )

  return {
    primary,
    secondary,
    credits: parseCredits(payload),
    metadata: {
      fetchedAt: fetchedAt.toISOString(),
      primaryRemainingPercent:
        primary?.usedPercent === null || primary?.usedPercent === undefined
          ? null
          : Math.max(0, Math.min(100, 100 - primary.usedPercent)),
      secondaryRemainingPercent:
        secondary?.usedPercent === null || secondary?.usedPercent === undefined
          ? null
          : Math.max(0, Math.min(100, 100 - secondary.usedPercent)),
    },
  }
}

function runCodexStatusProbe() {
  return new Promise<string>((resolve, reject) => {
    const child = spawn("codex", [], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    })
    let output = ""
    let finished = false
    const timeout = setTimeout(() => {
      if (finished) return
      finished = true
      child.kill()
      reject(new Error("Codex CLI status probe timed out"))
    }, 12_000)

    child.stdout.on("data", (chunk) => {
      output += chunk.toString()
    })
    child.stderr.on("data", (chunk) => {
      output += chunk.toString()
    })
    child.on("error", (error) => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      reject(error)
    })
    child.on("close", () => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      resolve(output)
    })

    child.stdin.write("/status\n")
    child.stdin.write("/quit\n")
    child.stdin.end()
  })
}

function parsePercentNear(text: string, labels: string[]) {
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const normalized = line.toLowerCase()
    if (!labels.some((label) => normalized.includes(label))) continue

    const match = /(\d+(?:\.\d+)?)\s*%/.exec(line)
    if (match) {
      return Number(match[1])
    }
  }

  return null
}

async function getCliSnapshot(identity: { email: string | null; plan: string | null }) {
  const output = await runCodexStatusProbe()
  const primaryPercent = parsePercentNear(output, ["5h", "session"])
  const secondaryPercent = parsePercentNear(output, ["weekly", "week"])
  const credits = parsePercentNear(output, ["credits"])

  return {
    sourceLabel: "codex-cli-status",
    status:
      primaryPercent !== null || secondaryPercent !== null || credits !== null
        ? "ok"
        : "unavailable",
    accountEmail: identity.email,
    accountPlan: identity.plan,
    primary: primaryPercent === null ? null : { usedPercent: primaryPercent, windowMinutes: 300 },
    secondary:
      secondaryPercent === null
        ? null
        : { usedPercent: secondaryPercent, windowMinutes: 10_080 },
    creditsRemaining: credits,
    hasCredits: credits !== null ? credits > 0 : null,
    metadata: {
      outputHash: createHash("sha256").update(output).digest("hex"),
    },
  } satisfies Partial<QuotaSnapshotInput>
}

function baseSnapshot(
  input: Omit<
    QuotaSnapshotInput,
    "provider" | "sourceType" | "name" | "collectionMethod" | "accuracy" | "privacyNote"
  > & {
    collectionMethod: string
    accuracy: string
  }
): QuotaSnapshotInput {
  const { collectionMethod, accuracy, ...snapshot } = input

  return {
    provider: "Codex",
    sourceType: "quota",
    name: "Codex quota",
    collectionMethod,
    accuracy,
    privacyNote:
      "Uses local Codex auth or CLI status to fetch quota windows. Tokens are not stored.",
    ...snapshot,
  }
}

export async function refreshCodexQuota(options: CodexQuotaRefreshOptions = {}) {
  const authPath = getAuthPath(options.authPath)
  const auth = await readAuth(authPath)
  const accessToken = auth ? findAccessToken(auth) : null
  const identity = auth ? findIdentity(auth, accessToken) : { email: null, plan: null }

  if (options.allowNetwork && accessToken) {
    try {
      const payload = await fetchOAuthQuota(accessToken)
      const parsed = parseOAuthPayload(payload)

      const result = await recordQuotaSnapshot(
        baseSnapshot({
          collectionMethod: "oauth",
          accuracy: "provider_aggregate",
          sourceLabel: "codex-oauth",
          status: "ok",
          accountEmail: identity.email,
          accountPlan: identity.plan,
          primary: parsed.primary,
          secondary: parsed.secondary,
          creditsRemaining: parsed.credits.creditsRemaining,
          hasCredits: parsed.credits.hasCredits,
          metadata: {
            authPathHash: createHash("sha256").update(authPath).digest("hex"),
            percentSemantics: "oauth_fields_are_used_percent_ui_shows_remaining",
            ...parsed.metadata,
            payloadShapeHash: createHash("sha256")
              .update(JSON.stringify(Object.keys(Object(payload)).sort()))
              .digest("hex"),
          },
        })
      )

      return { ...result, sourceLabel: "codex-oauth" }
    } catch (error) {
      if (!options.allowCliFallback) {
        const result = await recordQuotaSnapshot(
          baseSnapshot({
            collectionMethod: "oauth",
            accuracy: "provider_aggregate",
            sourceLabel: "codex-oauth",
            status: "error",
            accountEmail: identity.email,
            accountPlan: identity.plan,
            error: error instanceof Error ? error.message : "Quota refresh failed",
            metadata: {
              authPathHash: createHash("sha256").update(authPath).digest("hex"),
            },
          })
        )

        return { ...result, sourceLabel: "codex-oauth" }
      }
    }
  }

  if (options.allowCliFallback) {
    try {
      const cliSnapshot = await getCliSnapshot(identity)
      const result = await recordQuotaSnapshot(
        baseSnapshot({
          collectionMethod: "cli",
          accuracy: "provider_aggregate",
          ...cliSnapshot,
        })
      )

      return { ...result, sourceLabel: "codex-cli-status" }
    } catch (error) {
      const result = await recordQuotaSnapshot(
        baseSnapshot({
          collectionMethod: "cli",
          accuracy: "provider_aggregate",
          sourceLabel: "codex-cli-status",
          status: "error",
          accountEmail: identity.email,
          accountPlan: identity.plan,
          error: error instanceof Error ? error.message : "Codex CLI probe failed",
          metadata: {
            authPathHash: createHash("sha256").update(authPath).digest("hex"),
          },
        })
      )

      return { ...result, sourceLabel: "codex-cli-status" }
    }
  }

  const result = await recordQuotaSnapshot(
    baseSnapshot({
      collectionMethod: "local_auth",
      accuracy: "estimated",
      sourceLabel: "codex-local-auth",
      status: accessToken ? "auth_found" : "unavailable",
      accountEmail: identity.email,
      accountPlan: identity.plan,
      error: accessToken ? null : "Codex auth.json was not found or had no access token",
      metadata: {
        authPathHash: createHash("sha256").update(authPath).digest("hex"),
        hasAccessToken: Boolean(accessToken),
      },
    })
  )

  return { ...result, sourceLabel: "codex-local-auth" }
}
