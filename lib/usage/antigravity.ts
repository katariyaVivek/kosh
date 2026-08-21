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
  if (!name) return "gemini-3.7-flash"
  const clean = name.trim().toLowerCase()
  if (clean === "model_placeholder_m26") return "claude-3-7-sonnet"
  if (clean === "model_placeholder_m35") return "claude-opus-4-5"
  if (clean === "model_placeholder_m50") return "gemini-3.7-flash"
  if (clean === "model_placeholder_m7") return "claude-haiku-3-5"
  if (clean === "model_placeholder_m18") return "gemini-3.5-flash-lite"
  if (clean === "model_placeholder_m132") return "gemini-3.1-pro-preview"
  if (clean === "model_placeholder_m298") return "gemini-3.7-flash"
  if (clean === "model_google_gemini_2_5_flash_lite") return "gemini-3.5-flash-lite"
  if (clean === "gemini-pro-default") return "gemini-3.1-pro-preview"
  if (clean === "gemini-3.1-pro-high" || clean.includes("3.1-pro")) return "gemini-3.1-pro-preview"
  if (clean.includes("3.7") && clean.includes("flash")) return "gemini-3.7-flash"
  if (clean.includes("3.5") && clean.includes("flash")) return "gemini-3.5-flash-lite"
  if (clean === "gemini-3-flash-a" || clean.includes("3-flash")) return "gemini-3.7-flash"
  if (clean.includes("opus-4-6")) return "claude-opus-4-6-thinking"
  if (clean.includes("opus-4-5")) return "claude-opus-4-5"
  if (clean.includes("sonnet-3-7") || clean.includes("3-7-sonnet")) return "claude-3-7-sonnet"
  if (clean.includes("sonnet-4-5") || clean.includes("4-5-sonnet")) return "claude-sonnet-4-5"
  if (clean.includes("3.1") && clean.includes("pro")) return "gemini-3.1-pro-preview"
  if (clean.includes("3") && clean.includes("pro")) return "gemini-3.1-pro-preview"
  if (clean.includes("3") && clean.includes("flash")) return "gemini-3.7-flash"
  if (clean.includes("gemini")) return "gemini-3.7-flash"
  return normalizeModelName(clean)
}

function calculateCost(
  pricing: Map<string, ModelPricing>,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheRead = 0,
  cacheWrite = 0
) {
  const normModel = normalizeAntigravityModel(model)
  return estimateCostUsd(pricing, normModel, {
    input: inputTokens,
    output: outputTokens,
    cacheRead,
    cacheWrite,
  })
}

export async function importAntigravityUsage(inputPath?: string | null) {
  const defaultPath = getAntigravityDataDir()
  const sourcePath = inputPath ?? defaultPath
  const home = homedir()
  const geminiDir = path.join(/*turbopackIgnore: true*/ home, ".gemini")

  const brainRoots = inputPath
    ? [path.join(inputPath, "brain")]
    : [
        path.join(/*turbopackIgnore: true*/ geminiDir, "antigravity", "brain"),
        path.join(/*turbopackIgnore: true*/ geminiDir, "antigravity-cli", "brain"),
        path.join(/*turbopackIgnore: true*/ geminiDir, "antigravity-ide", "brain"),
      ]

  const samples: UsageSampleInput[] = []
  let totalFilesScanned = 0
  let totalSessionsScanned = 0
  let totalEntriesScanned = 0
  const seenKeys = new Set<string>()
  const nativeByConvo = new Map<string, Array<any>>()
  const pricing = await loadPricing()

  // 1. Ingest ground-truth API token caches
  for (const root of brainRoots) {
    const cf = path.join(/*turbopackIgnore: true*/ root, ".deep_stats_cache.json")
    if (existsSync(cf)) {
      totalFilesScanned++
      try {
        const raw = await readFile(/*turbopackIgnore: true*/ cf, "utf8")
        const d = JSON.parse(raw) as { perConvo?: Record<string, { entries?: Array<any> }> }
        for (const [cid, convo] of Object.entries(d.perConvo || {})) {
          if (!nativeByConvo.has(cid)) {
            nativeByConvo.set(cid, convo.entries || [])
          }
        }
      } catch {}
    }
  }

  for (const [cid, entries] of nativeByConvo.entries()) {
    totalSessionsScanned++
    let idx = 0
    for (const e of entries) {
      idx++
      totalEntriesScanned++
      const rawModel = e.model || "gemini-3-flash"
      const model = normalizeAntigravityModel(rawModel)
      const inp = Math.max(0, e.inp || 0)
      const out = Math.max(0, e.out || 0)
      const cacheRead = Math.max(0, e.cache || 0)
      const cacheWrite = Math.max(0, e.cacheWrite || 0)
      const totalTokens = inp + out + cacheRead + cacheWrite
      if (totalTokens === 0) continue

      const tsStr = e.ts || e.timestamp
      const date = tsStr ? new Date(tsStr) : new Date()
      if (Number.isNaN(date.getTime())) continue

      const dedupeKey = `antigravity:native:${cid}:${e.responseId || idx}`
      if (seenKeys.has(dedupeKey)) continue
      seenKeys.add(dedupeKey)

      const cost = calculateCost(pricing, model, inp, out, cacheRead, cacheWrite) ?? 0

      samples.push({
        externalId: dedupeKey,
        date,
        calls: 1,
        tokens: totalTokens,
        inputTokens: inp + cacheRead,
        outputTokens: out,
        model,
        cost,
        metadata: {
          costSource: cost > 0 ? "estimated" : "unknown",
          conversationId: cid,
          responseId: e.responseId,
          reasoning: e.reasoning || 0,
          provider: e.provider || "API_PROVIDER_GOOGLE_GEMINI",
          nativeGroundTruth: true,
        },
      })
    }
  }

  // 2. Ingest active sessions in brain transcripts not yet in native cache
  for (const root of brainRoots) {
    if (!existsSync(root)) continue
    let sessionDirs: string[] = []
    try {
      const entries = await readdir(/*turbopackIgnore: true*/ root, { withFileTypes: true })
      sessionDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => e.name)
    } catch {
      sessionDirs = []
    }

    for (const sessionDir of sessionDirs) {
      if (nativeByConvo.has(sessionDir)) continue

      const transcriptPath = path.join(
        /*turbopackIgnore: true*/ root,
        sessionDir,
        ".system_generated",
        "logs",
        "transcript.jsonl"
      )

      if (!existsSync(transcriptPath)) continue
      totalFilesScanned++
      totalSessionsScanned++

      let content: string
      try {
        content = await readFile(/*turbopackIgnore: true*/ transcriptPath, "utf8")
      } catch {
        continue
      }

      const lines = content.split("\n").filter((l) => l.trim().length > 0)
      let currentModel = "gemini-3-flash"
      let accumulatedContextChars = 0

      for (const line of lines) {
        totalEntriesScanned++
        try {
          const row = JSON.parse(line)
          if (!row || typeof row !== "object") continue

          if (typeof row.content === "string" && row.content.includes("Model Selection")) {
            const match = row.content.match(/Model Selection` from .*? to (.*?)\./)
            if (match && match[1]) {
              currentModel = normalizeAntigravityModel(match[1])
            }
          }

          const contentChars = typeof row.content === "string" ? row.content.length : 0
          const thinkingChars = typeof row.thinking === "string" ? row.thinking.length : 0
          const toolCallsChars = row.tool_calls ? JSON.stringify(row.tool_calls).length : 0
          const stepChars = contentChars + thinkingChars + toolCallsChars

          if (row.type !== "PLANNER_RESPONSE") {
            accumulatedContextChars += stepChars
            continue
          }

          const createdAtStr = row.created_at || row.timestamp
          if (!createdAtStr) continue
          const date = new Date(createdAtStr)
          if (Number.isNaN(date.getTime())) continue

          const stepIdx = row.step_index ?? totalEntriesScanned
          const dedupeKey = `antigravity:transcript:${sessionDir}:${stepIdx}`
          if (seenKeys.has(dedupeKey)) continue
          seenKeys.add(dedupeKey)

          const outputTokens = Math.max(1, Math.round(stepChars / 3.8))
          const cacheRead = Math.round(accumulatedContextChars / 3.8)
          const inputTokens = Math.max(1, Math.round(stepChars / 3.8))
          const totalTokens = inputTokens + outputTokens + cacheRead

          accumulatedContextChars += stepChars

          const cost = calculateCost(pricing, currentModel, inputTokens, outputTokens, cacheRead, 0) ?? 0

          samples.push({
            externalId: dedupeKey,
            date,
            calls: 1,
            tokens: totalTokens,
            inputTokens: inputTokens + cacheRead,
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
        } catch {}
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
        accuracy: "exact",
        privacyNote:
          "Reads local Antigravity ground-truth API token stats and session logs, storing token and cost metadata only.",
        metadata: {
          sourcePathHash: createHash("sha256").update(sourcePath).digest("hex"),
          filesScanned: totalFilesScanned,
          sessionsScanned: totalSessionsScanned,
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
    sessionsScanned: totalSessionsScanned,
    entriesScanned: totalEntriesScanned,
    entriesImported: samples.length,
    sourcePath,
  } satisfies AntigravityImportResult
}
