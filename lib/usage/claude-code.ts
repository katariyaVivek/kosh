import { createHash } from "crypto"
import { existsSync } from "fs"
import { readdir, readFile } from "fs/promises"
import path from "path"

import { ingestUsage, type UsageSampleInput } from "@/lib/usage/ingest"
import {
  estimateCostUsd,
  findPricing,
  loadPricing,
  normalizeModelName,
  type ModelPricing,
} from "@/lib/usage/pricing"

type ClaudeUsageShape = {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  cacheCreationInputTokens?: number
  cacheReadInputTokens?: number
  inputTokens?: number
  outputTokens?: number
}

type ClaudeJsonLine = {
  uuid?: string
  requestId?: string
  request_id?: string
  timestamp?: string
  model?: string
  costUSD?: number
  message?: {
    id?: string
    model?: string
    usage?: ClaudeUsageShape
  }
  usage?: ClaudeUsageShape
}

export type ClaudeCodeImportResult = {
  filesScanned: number
  entriesScanned: number
  entriesImported: number
  sourcePath: string
}

const DEFAULT_CLAUDE_DIR = ".claude"
const DEFAULT_PROJECTS_DIR = "projects"



function toNumber(value: unknown) {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

function getDefaultClaudeProjectsPath() {
  const home = process.env.HOME ?? process.env.USERPROFILE

  if (!home) {
    throw new Error("Unable to resolve the home directory")
  }

  return path.join(
    /*turbopackIgnore: true*/ home,
    DEFAULT_CLAUDE_DIR,
    DEFAULT_PROJECTS_DIR
  )
}

function resolveImportPath(inputPath?: string | null) {
  if (!inputPath) {
    return getDefaultClaudeProjectsPath()
  }

  return path.resolve(/*turbopackIgnore: true*/ inputPath)
}

async function findJsonlFiles(root: string) {
  const files: string[] = []

  async function visit(current: string) {
    const entries = await readdir(/*turbopackIgnore: true*/ current, {
      withFileTypes: true,
    })

    for (const entry of entries) {
      const absolutePath = path.join(
        /*turbopackIgnore: true*/ current,
        entry.name
      )

      if (entry.isDirectory()) {
        await visit(absolutePath)
        continue
      }

      if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        files.push(absolutePath)
      }
    }
  }

  await visit(root)

  return files
}

function getUsage(entry: ClaudeJsonLine) {
  return entry.message?.usage ?? entry.usage ?? null
}

function getModel(entry: ClaudeJsonLine) {
  return entry.message?.model ?? entry.model ?? "claude-code"
}

function getTimestamp(entry: ClaudeJsonLine) {
  if (!entry.timestamp) {
    return null
  }

  const date = new Date(entry.timestamp)

  return Number.isNaN(date.getTime()) ? null : date
}

function getCacheCreationTokens(usage: ClaudeUsageShape) {
  return toNumber(
    usage.cache_creation_input_tokens ?? usage.cacheCreationInputTokens
  )
}

function getCacheReadTokens(usage: ClaudeUsageShape) {
  return toNumber(usage.cache_read_input_tokens ?? usage.cacheReadInputTokens)
}

function getInputTokens(usage: ClaudeUsageShape) {
  return toNumber(usage.input_tokens ?? usage.inputTokens)
}

function getOutputTokens(usage: ClaudeUsageShape) {
  return toNumber(usage.output_tokens ?? usage.outputTokens)
}

function toUsageSample(
  filePath: string,
  lineNumber: number,
  entry: ClaudeJsonLine,
  pricing: Map<string, ModelPricing>,
): UsageSampleInput | null {
  const usage = getUsage(entry)
  const timestamp = getTimestamp(entry)

  if (!usage || !timestamp) {
    return null
  }

  const inputTokens = getInputTokens(usage) + getCacheCreationTokens(usage) + getCacheReadTokens(usage)
  const outputTokens = getOutputTokens(usage)
  const totalTokens = inputTokens + outputTokens
  const model = getModel(entry)
  const hasExplicitCost = typeof entry.costUSD === "number" && entry.costUSD > 0
  const estimatedCost = hasExplicitCost
    ? null
    : estimateCostUsd(pricing, model, {
        input: getInputTokens(usage),
        output: getOutputTokens(usage),
        cacheWrite: getCacheCreationTokens(usage),
        cacheRead: getCacheReadTokens(usage),
      })
  const pricingModel = findPricing(pricing, model)
  const costSource = hasExplicitCost
    ? "explicit"
    : estimatedCost !== null
      ? "estimated"
      : "unknown"

  if (totalTokens <= 0) {
    return null
  }

  return {
    externalId: getExternalId(filePath, lineNumber, entry),
    date: timestamp,
    calls: 1,
    cost:
      typeof entry.costUSD === "number" && entry.costUSD > 0
        ? entry.costUSD
        : (estimatedCost ?? 0),
    inputTokens,
    outputTokens,
    tokens: totalTokens,
    model,
    metadata: {
      costSource,
      pricingModel: pricingModel !== null ? normalizeModelName(model) : null,
      cacheCreationTokens: getCacheCreationTokens(usage),
      cacheReadTokens: getCacheReadTokens(usage),
      fileHash: createHash("sha256").update(filePath).digest("hex"),
      lineNumber,
    },
  }
}

function getExternalId(filePath: string, lineNumber: number, entry: ClaudeJsonLine) {
  const stableId =
    entry.requestId ?? entry.request_id ?? entry.message?.id ?? entry.uuid

  if (stableId) {
    return `claude-code:${stableId}`
  }

  return `claude-code:${createHash("sha256")
    .update(`${filePath}:${lineNumber}:${entry.timestamp ?? ""}`)
    .digest("hex")}`
}

async function parseClaudeJsonlFile(filePath: string, pricing: Map<string, ModelPricing>) {
  const content = await readFile(/*turbopackIgnore: true*/ filePath, "utf8")
  const samples: UsageSampleInput[] = []
  let entriesScanned = 0

  content.split(/\r?\n/).forEach((line, index) => {
    const trimmedLine = line.trim()

    if (!trimmedLine) {
      return
    }

    entriesScanned += 1

    try {
      const entry = JSON.parse(trimmedLine) as ClaudeJsonLine
      const sample = toUsageSample(filePath, index + 1, entry, pricing)

      if (sample) {
        samples.push(sample)
      }
    } catch {
      // Ignore malformed records from partial writes or interrupted sessions.
    }
  })

  return { samples, entriesScanned }
}

export async function importClaudeCodeUsage(inputPath?: string | null) {
  const sourcePath = resolveImportPath(inputPath)

  if (!existsSync(/*turbopackIgnore: true*/ sourcePath)) {
    throw new Error("Claude Code usage directory was not found")
  }

  const files = await findJsonlFiles(sourcePath)
  let entriesScanned = 0
  const samples: UsageSampleInput[] = []
  const pricing = await loadPricing()

  for (const file of files) {
    const result = await parseClaudeJsonlFile(file, pricing)
    entriesScanned += result.entriesScanned
    samples.push(...result.samples)
  }

  await ingestUsage({
    source: {
      name: "Claude Code local usage",
      sourceType: "local_tool",
      provider: "Claude Code",
      collectionMethod: "local_logs",
      accuracy: "estimated",
      privacyNote:
        "Reads local Claude Code JSONL usage fields and stores token/cost metadata only.",
      metadata: {
        sourcePathHash: createHash("sha256").update(sourcePath).digest("hex"),
        filesScanned: files.length,
        entriesScanned,
        entriesImported: samples.length,
        lastImportedAt: new Date().toISOString(),
      },
    },
    samples,
  })

  return {
    filesScanned: files.length,
    entriesScanned,
    entriesImported: samples.length,
    sourcePath,
  } satisfies ClaudeCodeImportResult
}
