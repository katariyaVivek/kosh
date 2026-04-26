import { createHash } from "crypto"
import { existsSync } from "fs"
import { readdir, readFile } from "fs/promises"
import path from "path"

import { ingestUsage, type UsageSampleInput } from "@/lib/usage/ingest"

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

const MODEL_PRICING_PER_MILLION = [
  {
    match: "opus-4-7",
    input: 5,
    output: 25,
    cacheCreate: 6.25,
    cacheRead: 0.5,
  },
  {
    match: "opus-4-6",
    input: 5,
    output: 25,
    cacheCreate: 6.25,
    cacheRead: 0.5,
  },
  {
    match: "opus-4-5",
    input: 5,
    output: 25,
    cacheCreate: 6.25,
    cacheRead: 0.5,
  },
  {
    match: "opus-4-1",
    input: 15,
    output: 75,
    cacheCreate: 18.75,
    cacheRead: 1.5,
  },
  {
    match: "opus-4",
    input: 15,
    output: 75,
    cacheCreate: 18.75,
    cacheRead: 1.5,
  },
  {
    match: "sonnet-4-6",
    input: 3,
    output: 15,
    cacheCreate: 3.75,
    cacheRead: 0.3,
  },
  {
    match: "sonnet-4-5",
    input: 3,
    output: 15,
    cacheCreate: 3.75,
    cacheRead: 0.3,
  },
  {
    match: "sonnet-4",
    input: 3,
    output: 15,
    cacheCreate: 3.75,
    cacheRead: 0.3,
  },
  {
    match: "sonnet-3-7",
    input: 3,
    output: 15,
    cacheCreate: 3.75,
    cacheRead: 0.3,
  },
  {
    match: "haiku-4-5",
    input: 1,
    output: 5,
    cacheCreate: 1.25,
    cacheRead: 0.1,
  },
  {
    match: "haiku-3-5",
    input: 0.8,
    output: 4,
    cacheCreate: 1,
    cacheRead: 0.08,
  },
  {
    match: "haiku-3",
    input: 0.25,
    output: 1.25,
    cacheCreate: 0.3,
    cacheRead: 0.03,
  },
]

function normalizeModelName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

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

function estimateCostUsd(model: string, usage: ClaudeUsageShape) {
  const normalizedModel = normalizeModelName(model)
  const pricing =
    MODEL_PRICING_PER_MILLION.find((entry) =>
      normalizedModel.includes(entry.match)
    )

  if (!pricing) {
    return null
  }

  return (
    (getInputTokens(usage) * pricing.input +
      getOutputTokens(usage) * pricing.output +
      getCacheCreationTokens(usage) * pricing.cacheCreate +
      getCacheReadTokens(usage) * pricing.cacheRead) /
    1_000_000
  )
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

function toUsageSample(
  filePath: string,
  lineNumber: number,
  entry: ClaudeJsonLine
): UsageSampleInput | null {
  const usage = getUsage(entry)
  const timestamp = getTimestamp(entry)

  if (!usage || !timestamp) {
    return null
  }

  const inputTokens = getInputTokens(usage) + getCacheCreationTokens(usage) + getCacheReadTokens(usage)
  const outputTokens = getOutputTokens(usage)
  const totalTokens = inputTokens + outputTokens
  const explicitCost = entry.costUSD
  const model = getModel(entry)
  const estimatedCost =
    explicitCost === undefined || explicitCost === null
      ? estimateCostUsd(model, usage)
      : null
  const pricingModel = MODEL_PRICING_PER_MILLION.find((entry) =>
    normalizeModelName(model).includes(entry.match)
  )
  const costSource =
    explicitCost !== undefined && explicitCost !== null
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
    cost: explicitCost ?? estimatedCost ?? 0,
    inputTokens,
    outputTokens,
    tokens: totalTokens,
    model,
    metadata: {
      costSource,
      pricingModel: pricingModel?.match ?? null,
      cacheCreationTokens: getCacheCreationTokens(usage),
      cacheReadTokens: getCacheReadTokens(usage),
      fileHash: createHash("sha256").update(filePath).digest("hex"),
      lineNumber,
    },
  }
}

async function parseClaudeJsonlFile(filePath: string) {
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
      const sample = toUsageSample(filePath, index + 1, entry)

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

  for (const file of files) {
    const result = await parseClaudeJsonlFile(file)
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
