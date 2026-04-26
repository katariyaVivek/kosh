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
    match: "opus",
    input: 15,
    output: 75,
    cacheCreate: 18.75,
    cacheRead: 1.5,
  },
  {
    match: "sonnet",
    input: 3,
    output: 15,
    cacheCreate: 3.75,
    cacheRead: 0.3,
  },
  {
    match: "haiku",
    input: 0.8,
    output: 4,
    cacheCreate: 1,
    cacheRead: 0.08,
  },
]

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
  const normalizedModel = model.toLowerCase()
  const pricing =
    MODEL_PRICING_PER_MILLION.find((entry) =>
      normalizedModel.includes(entry.match)
    ) ?? MODEL_PRICING_PER_MILLION.find((entry) => entry.match === "sonnet")

  if (!pricing) {
    return 0
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
  const costSource =
    entry.costUSD === undefined || entry.costUSD === null
      ? "estimated"
      : "explicit"

  if (totalTokens <= 0) {
    return null
  }

  const model = getModel(entry)

  return {
    externalId: getExternalId(filePath, lineNumber, entry),
    date: timestamp,
    calls: 1,
    cost:
      entry.costUSD === undefined || entry.costUSD === null
        ? estimateCostUsd(model, usage)
        : entry.costUSD,
    inputTokens,
    outputTokens,
    tokens: totalTokens,
    model,
    metadata: {
      costSource,
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
