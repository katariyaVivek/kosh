import { createHash } from "crypto"
import { existsSync } from "fs"
import { readdir, readFile } from "fs/promises"
import { homedir } from "os"
import path from "path"

import { ingestUsage, type UsageSampleInput } from "@/lib/usage/ingest"
import {
  estimateCostUsd,
  loadPricing,
  normalizeModelName,
  type ModelPricing,
} from "@/lib/usage/pricing"

export type AntigravityImportResult = {
  filesScanned: number
  sessionsScanned: number
  entriesScanned: number
  entriesImported: number
  sourcePath: string
}

function getAntigravityDataDir() {
  if (process.env.ANTIGRAVITY_DATA_DIR) {
    return process.env.ANTIGRAVITY_DATA_DIR
  }
  const home = homedir()
  return path.join(/*turbopackIgnore: true*/ home, ".gemini", "antigravity-cli")
}

function normalizeAntigravityModel(name?: string | null): string {
  if (!name) return "gemini-2.5-flash"
  const clean = name.toLowerCase()
  if (clean.includes("3.7") && clean.includes("flash")) return "gemini-3.7-flash"
  if (clean.includes("2.5") && clean.includes("pro")) return "gemini-2.5-pro"
  if (clean.includes("2.5") && clean.includes("flash")) return "gemini-2.5-flash"
  if (clean.includes("1.5") && clean.includes("pro")) return "gemini-1.5-pro"
  if (clean.includes("1.5") && clean.includes("flash")) return "gemini-1.5-flash"
  if (clean.includes("gemini")) return "gemini-2.5-flash"
  return normalizeModelName(clean)
}

function calculateCost(
  pricing: Map<string, ModelPricing>,
  model: string,
  inputTokens: number,
  outputTokens: number
) {
  const normModel = normalizeAntigravityModel(model)
  return estimateCostUsd(pricing, normModel, {
    input: inputTokens,
    output: outputTokens,
    cacheCreate: 0,
    cacheRead: 0,
  })
}

export async function importAntigravityUsage(inputPath?: string | null) {
  const sourcePath = inputPath ?? getAntigravityDataDir()
  const brainDir = path.join(sourcePath, "brain")

  if (!existsSync(brainDir)) {
    return {
      filesScanned: 0,
      sessionsScanned: 0,
      entriesScanned: 0,
      entriesImported: 0,
      sourcePath,
    } satisfies AntigravityImportResult
  }

  let sessionDirs: string[] = []
  try {
    const entries = await readdir(/*turbopackIgnore: true*/ brainDir, { withFileTypes: true })
    sessionDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    sessionDirs = []
  }

  if (sessionDirs.length === 0) {
    return {
      filesScanned: 0,
      sessionsScanned: 0,
      entriesScanned: 0,
      entriesImported: 0,
      sourcePath,
    } satisfies AntigravityImportResult
  }

  const samples: UsageSampleInput[] = []
  let totalFilesScanned = 0
  let totalEntriesScanned = 0
  const seenKeys = new Set<string>()
  const pricing = await loadPricing()

  for (const sessionDir of sessionDirs) {
    const transcriptPath = path.join(
      /*turbopackIgnore: true*/ brainDir,
      sessionDir,
      ".system_generated",
      "logs",
      "transcript.jsonl"
    )

    if (!existsSync(transcriptPath)) continue

    totalFilesScanned++
    let content: string
    try {
      content = await readFile(/*turbopackIgnore: true*/ transcriptPath, "utf8")
    } catch {
      continue
    }

    const lines = content.split("\n").filter((l) => l.trim().length > 0)
    let currentModel = "gemini-2.5-flash"

    for (const line of lines) {
      totalEntriesScanned++
      try {
        const row = JSON.parse(line)
        if (!row || typeof row !== "object") continue

        // Check if model changed in session settings
        if (typeof row.content === "string" && row.content.includes("Model Selection")) {
          const match = row.content.match(/Model Selection` from .*? to (.*?)\./)
          if (match && match[1]) {
            currentModel = match[1].trim()
          }
        }

        const createdAtStr = row.created_at || row.timestamp
        if (!createdAtStr) continue
        const date = new Date(createdAtStr)
        if (Number.isNaN(date.getTime())) continue

        const stepIdx = row.step_index ?? totalEntriesScanned
        const dedupeKey = `antigravity:${sessionDir}:${stepIdx}`
        if (seenKeys.has(dedupeKey)) continue
        seenKeys.add(dedupeKey)

        let inputTokens = 0
        let outputTokens = 0

        if (row.type === "PLANNER_RESPONSE") {
          const contentChars = typeof row.content === "string" ? row.content.length : 0
          const thinkingChars = typeof row.thinking === "string" ? row.thinking.length : 0
          const toolCallsChars = row.tool_calls ? JSON.stringify(row.tool_calls).length : 0
          outputTokens = Math.max(1, Math.round((contentChars + thinkingChars + toolCallsChars) / 3.8))
        } else if (row.type === "USER_INPUT" || row.type === "GENERIC" || row.type === "SYSTEM_MESSAGE") {
          const contentChars = typeof row.content === "string" ? row.content.length : 0
          inputTokens = Math.max(1, Math.round(contentChars / 3.8))
        } else {
          continue
        }

        const totalTokens = inputTokens + outputTokens
        if (totalTokens === 0) continue

        const cost = calculateCost(pricing, currentModel, inputTokens, outputTokens) ?? 0

        samples.push({
          externalId: dedupeKey,
          date,
          calls: 1,
          tokens: totalTokens,
          inputTokens,
          outputTokens,
          model: normalizeAntigravityModel(currentModel),
          cost,
          metadata: {
            costSource: cost > 0 ? "estimated" : "unknown",
            conversationId: sessionDir,
            stepIndex: stepIdx,
            type: row.type,
            source: row.source,
          },
        })
      } catch {
        // Skip malformed line
      }
    }
  }

  if (samples.length > 0) {
    await ingestUsage({
      source: {
        name: "Antigravity local usage",
        sourceType: "local_tool",
        provider: "Antigravity",
        collectionMethod: "local_logs",
        accuracy: "estimated",
        privacyNote:
          "Reads local Antigravity transcript and session logs, storing token and cost metadata only.",
        metadata: {
          sourcePathHash: createHash("sha256")
            .update(sourcePath)
            .digest("hex"),
          filesScanned: totalFilesScanned,
          sessionsScanned: sessionDirs.length,
          entriesScanned: totalEntriesScanned,
          entriesImported: samples.length,
          lastImportedAt: new Date().toISOString(),
        },
      },
      samples,
    })
  }

  return {
    filesScanned: totalFilesScanned,
    sessionsScanned: sessionDirs.length,
    entriesScanned: totalEntriesScanned,
    entriesImported: samples.length,
    sourcePath,
  } satisfies AntigravityImportResult
}
