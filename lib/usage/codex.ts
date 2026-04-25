import { createHash } from "crypto"
import { existsSync } from "fs"
import { readdir, readFile } from "fs/promises"
import path from "path"

import { ingestUsage, type UsageSampleInput } from "@/lib/usage/ingest"

type TokenUsageShape = Record<string, unknown>

type CodexJsonLine = {
  id?: string
  type?: string
  timestamp?: string
  ts?: string
  created_at?: string
  model?: string
  costUSD?: number
  cost_usd?: number
  usage?: TokenUsageShape
  token_usage?: TokenUsageShape
  tokenUsage?: TokenUsageShape
  tokens?: TokenUsageShape
  payload?: {
    id?: string
    type?: string
    timestamp?: string
    model?: string
    usage?: TokenUsageShape
    token_usage?: TokenUsageShape
    tokenUsage?: TokenUsageShape
    tokens?: TokenUsageShape
    info?: {
      last_token_usage?: TokenUsageShape
      total_token_usage?: TokenUsageShape
    }
    rate_limits?: Record<string, unknown>
  }
  event?: {
    timestamp?: string
    model?: string
    usage?: TokenUsageShape
    token_usage?: TokenUsageShape
  }
}

export type CodexImportResult = {
  filesScanned: number
  entriesScanned: number
  entriesImported: number
  sourcePath: string
}

const DEFAULT_CODEX_DIR = ".codex"

const MODEL_PRICING_PER_MILLION = [
  {
    match: "codex-mini",
    input: 1.5,
    output: 6,
    cachedInput: 0.375,
    reasoningOutput: 6,
  },
  {
    match: "gpt-5",
    input: 1.5,
    output: 6,
    cachedInput: 0.375,
    reasoningOutput: 6,
  },
]

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

function getDefaultCodexPath() {
  const home = process.env.HOME ?? process.env.USERPROFILE

  if (!home) {
    throw new Error("Unable to resolve the home directory")
  }

  return path.join(/*turbopackIgnore: true*/ home, DEFAULT_CODEX_DIR)
}

function resolveImportPath(inputPath?: string | null) {
  if (!inputPath) {
    return getDefaultCodexPath()
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

function pickUsage(entry: CodexJsonLine) {
  return (
    entry.payload?.info?.last_token_usage ??
    entry.payload?.info?.total_token_usage ??
    entry.usage ??
    entry.token_usage ??
    entry.tokenUsage ??
    entry.tokens ??
    entry.payload?.usage ??
    entry.payload?.token_usage ??
    entry.payload?.tokenUsage ??
    entry.payload?.tokens ??
    entry.event?.usage ??
    entry.event?.token_usage ??
    null
  )
}

function pickTimestamp(entry: CodexJsonLine) {
  const rawTimestamp =
    entry.timestamp ??
    entry.ts ??
    entry.created_at ??
    entry.payload?.timestamp ??
    entry.event?.timestamp

  if (!rawTimestamp) {
    return null
  }

  const timestamp = new Date(rawTimestamp)

  return Number.isNaN(timestamp.getTime()) ? null : timestamp
}

function pickModel(entry: CodexJsonLine) {
  return entry.model ?? entry.payload?.model ?? entry.event?.model ?? "codex"
}

function pickStableId(entry: CodexJsonLine) {
  return entry.id ?? entry.payload?.id
}

function getInputTokens(usage: TokenUsageShape) {
  return toNumber(
    usage.input_tokens ??
      usage.inputTokens ??
      usage.input ??
      usage.inputTokenCount
  )
}

function getCachedInputTokens(usage: TokenUsageShape) {
  return toNumber(
    usage.cached_input_tokens ??
      usage.cachedInputTokens ??
      usage.cache_read_input_tokens ??
      usage.cacheReadInputTokens ??
      usage.cachedInputTokenCount
  )
}

function getOutputTokens(usage: TokenUsageShape) {
  return toNumber(
    usage.output_tokens ??
      usage.outputTokens ??
      usage.output ??
      usage.outputTokenCount
  )
}

function getReasoningOutputTokens(usage: TokenUsageShape) {
  return toNumber(
    usage.reasoning_output_tokens ??
      usage.reasoningOutputTokens ??
      usage.reasoning_tokens ??
      usage.reasoningTokens
  )
}

function getTotalTokens(usage: TokenUsageShape) {
  const explicitTotal = toNumber(
    usage.total_tokens ?? usage.totalTokens ?? usage.total
  )

  if (explicitTotal > 0) {
    return explicitTotal
  }

  return (
    getInputTokens(usage) +
    getCachedInputTokens(usage) +
    getOutputTokens(usage) +
    getReasoningOutputTokens(usage)
  )
}

function estimateCostUsd(model: string, usage: TokenUsageShape) {
  const normalizedModel = model.toLowerCase()
  const pricing =
    MODEL_PRICING_PER_MILLION.find((entry) =>
      normalizedModel.includes(entry.match)
    ) ?? MODEL_PRICING_PER_MILLION[0]

  return (
    (getInputTokens(usage) * pricing.input +
      getCachedInputTokens(usage) * pricing.cachedInput +
      getOutputTokens(usage) * pricing.output +
      getReasoningOutputTokens(usage) * pricing.reasoningOutput) /
    1_000_000
  )
}

function getExternalId(filePath: string, lineNumber: number, entry: CodexJsonLine) {
  const stableId = pickStableId(entry)

  if (stableId) {
    return `codex:${stableId}`
  }

  return `codex:${createHash("sha256")
    .update(`${filePath}:${lineNumber}:${entry.timestamp ?? entry.ts ?? ""}`)
    .digest("hex")}`
}

function toUsageSample(
  filePath: string,
  lineNumber: number,
  entry: CodexJsonLine
): UsageSampleInput | null {
  const usage = pickUsage(entry)
  const timestamp = pickTimestamp(entry)

  if (!usage || !timestamp) {
    return null
  }

  const totalTokens = getTotalTokens(usage)

  if (totalTokens <= 0) {
    return null
  }

  const model = pickModel(entry)
  const inputTokens = getInputTokens(usage) + getCachedInputTokens(usage)
  const outputTokens = getOutputTokens(usage) + getReasoningOutputTokens(usage)
  const explicitCost = toNumber(entry.costUSD ?? entry.cost_usd)
  const totalUsage = entry.payload?.info?.total_token_usage ?? null

  return {
    externalId: getExternalId(filePath, lineNumber, entry),
    date: timestamp,
    calls: 1,
    cost: explicitCost || estimateCostUsd(model, usage),
    inputTokens,
    outputTokens,
    tokens: totalTokens,
    model,
    metadata: {
      cachedInputTokens: getCachedInputTokens(usage),
      reasoningOutputTokens: getReasoningOutputTokens(usage),
      eventType: entry.type ?? entry.payload?.type ?? null,
      totalInputTokens: totalUsage ? getInputTokens(totalUsage) : null,
      totalCachedInputTokens: totalUsage ? getCachedInputTokens(totalUsage) : null,
      totalOutputTokens: totalUsage ? getOutputTokens(totalUsage) : null,
      totalReasoningOutputTokens: totalUsage
        ? getReasoningOutputTokens(totalUsage)
        : null,
      totalTokensSeen: totalUsage ? getTotalTokens(totalUsage) : null,
      rateLimits: entry.payload?.rate_limits ?? null,
      fileHash: createHash("sha256").update(filePath).digest("hex"),
      lineNumber,
    },
  }
}

async function parseCodexJsonlFile(filePath: string) {
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
      const entry = JSON.parse(trimmedLine) as CodexJsonLine
      const sample = toUsageSample(filePath, index + 1, entry)

      if (sample) {
        samples.push(sample)
      }
    } catch {
      // Ignore malformed records from interrupted sessions or partial writes.
    }
  })

  return { samples, entriesScanned }
}

export async function importCodexUsage(inputPath?: string | null) {
  const sourcePath = resolveImportPath(inputPath)

  if (!existsSync(/*turbopackIgnore: true*/ sourcePath)) {
    throw new Error("Codex usage directory was not found")
  }

  const files = await findJsonlFiles(sourcePath)
  let entriesScanned = 0
  const samples: UsageSampleInput[] = []

  for (const file of files) {
    const result = await parseCodexJsonlFile(file)
    entriesScanned += result.entriesScanned
    samples.push(...result.samples)
  }

  await ingestUsage({
    source: {
      name: "Codex local usage",
      sourceType: "local_tool",
      provider: "Codex",
      collectionMethod: "local_logs",
      accuracy: "estimated",
      privacyNote:
        "Reads local Codex JSONL usage fields and stores token/cost metadata only.",
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
  } satisfies CodexImportResult
}
