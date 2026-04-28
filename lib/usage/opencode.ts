import { createHash } from "crypto"
import { readdir } from "fs/promises"
import { DatabaseSync } from "node:sqlite"
import { homedir } from "os"
import path from "path"

import { ingestUsage, type UsageSampleInput } from "@/lib/usage/ingest"
import {
  estimateCostUsd,
  loadPricing,
  type ModelPricing,
} from "@/lib/usage/pricing"

type MessageData = {
  role: string
  modelID?: string
  cost?: number
  tokens?: {
    input?: number
    output?: number
    reasoning?: number
    cache?: { read?: number; write?: number }
  }
}

type MessageRow = {
  id: string
  session_id: string
  time_created: number
  data: string
}

type SessionRow = {
  id: string
  directory: string
  title: string
  time_created: number
}

export type OpenCodeImportResult = {
  filesScanned: number
  sessionsScanned: number
  entriesScanned: number
  entriesImported: number
  sourcePath: string
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function getOpenCodeDataDir() {
  const base =
    process.env.XDG_DATA_HOME ??
    path.join(/*turbopackIgnore: true*/ homedir(), ".local", "share")
  return path.join(/*turbopackIgnore: true*/ base, "opencode")
}

function parseTimestamp(raw: number): Date {
  const ms = raw < 1e12 ? raw * 1000 : raw
  return new Date(ms)
}

async function findDbFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(/*turbopackIgnore: true*/ dir)

    return entries
      .filter((f) => f.startsWith("opencode") && f.endsWith(".db"))
      .map((f) => path.join(/*turbopackIgnore: true*/ dir, f))
  } catch {
    return []
  }
}

export async function importOpenCodeUsage(inputPath?: string | null) {
  const sourcePath = inputPath ?? getOpenCodeDataDir()
  const dbFiles = await findDbFiles(sourcePath)

  if (dbFiles.length === 0) {
    return {
      filesScanned: 0,
      sessionsScanned: 0,
      entriesScanned: 0,
      entriesImported: 0,
      sourcePath,
    } satisfies OpenCodeImportResult
  }

  const samples: UsageSampleInput[] = []
  let totalMessagesScanned = 0
  let totalSessionsScanned = 0
  const seenKeys = new Set<string>()
  const pricing = await loadPricing()

  for (const dbPath of dbFiles) {
    let db: DatabaseSync

    try {
      db = new DatabaseSync(/*turbopackIgnore: true*/ dbPath)
    } catch {
      continue
    }

    try {
      const sessions = db
        .prepare(
          "SELECT id, directory, title, time_created FROM session WHERE time_archived IS NULL AND parent_id IS NULL"
        )
        .all() as SessionRow[]

      for (const session of sessions) {
        totalSessionsScanned++

        const messages = db
          .prepare(
            "SELECT id, session_id, time_created, data FROM message WHERE session_id = ? ORDER BY time_created ASC"
          )
          .all(session.id) as MessageRow[]

        for (const msg of messages) {
          let data: MessageData

          try {
            data = JSON.parse(msg.data) as MessageData
          } catch {
            continue
          }

          if (data.role !== "assistant") continue

          const tokens = {
            input: toNumber(data.tokens?.input),
            output: toNumber(data.tokens?.output),
            reasoning: toNumber(data.tokens?.reasoning),
            cacheRead: toNumber(data.tokens?.cache?.read),
            cacheWrite: toNumber(data.tokens?.cache?.write),
          }

          const allZero =
            tokens.input === 0 &&
            tokens.output === 0 &&
            tokens.reasoning === 0 &&
            tokens.cacheRead === 0 &&
            tokens.cacheWrite === 0

          if (allZero && (data.cost ?? 0) === 0) continue

          totalMessagesScanned++
          const model = data.modelID ?? "unknown"
          const dedupKey = `opencode:${session.id}:${msg.id}`

          if (seenKeys.has(dedupKey)) continue

          seenKeys.add(dedupKey)

          const estimatedCost = estimateCostUsd(pricing, model, {
            input: tokens.input,
            output: tokens.output + tokens.reasoning,
            cacheWrite: tokens.cacheWrite,
            cacheRead: tokens.cacheRead,
          })
          const hasExplicitCost = typeof data.cost === "number" && data.cost > 0
          const costSource = hasExplicitCost
            ? "explicit"
            : estimatedCost !== null
              ? "estimated"
              : "unknown"

          const inputTotal =
            tokens.input + tokens.cacheRead + tokens.cacheWrite
          const outputTotal = tokens.output + tokens.reasoning

          samples.push({
            externalId: dedupKey,
            date: parseTimestamp(msg.time_created),
            calls: 1,
            cost: typeof data.cost === "number" && data.cost > 0 ? data.cost : (estimatedCost ?? 0),
            inputTokens: inputTotal,
            outputTokens: outputTotal,
            tokens: inputTotal + outputTotal,
            model,
            metadata: {
              costSource,
              reasoningTokens: tokens.reasoning,
              cacheReadTokens: tokens.cacheRead,
              cacheWriteTokens: tokens.cacheWrite,
              sessionId: session.id,
            },
          })
        }
      }
    } finally {
      db.close()
    }
  }

  if (samples.length > 0) {
    await ingestUsage({
      source: {
        name: "OpenCode local usage",
        sourceType: "local_tool",
        provider: "OpenCode",
        collectionMethod: "local_logs",
        accuracy: "estimated",
        privacyNote:
          "Reads local OpenCode SQLite session data and stores token/cost metadata only.",
        metadata: {
          sourcePathHash: createHash("sha256")
            .update(sourcePath)
            .digest("hex"),
          filesScanned: dbFiles.length,
          sessionsScanned: totalSessionsScanned,
          entriesScanned: totalMessagesScanned,
          entriesImported: samples.length,
          lastImportedAt: new Date().toISOString(),
        },
      },
      samples,
    })
  }

  return {
    filesScanned: dbFiles.length,
    sessionsScanned: totalSessionsScanned,
    entriesScanned: totalMessagesScanned,
    entriesImported: samples.length,
    sourcePath,
  } satisfies OpenCodeImportResult
}
