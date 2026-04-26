import { createHash } from "crypto"
import { execFile } from "child_process"
import { existsSync } from "fs"
import { readdir, readFile } from "fs/promises"
import path from "path"
import { promisify } from "util"

import { db } from "@/lib/db"
import { ingestUsage, type UsageSampleInput } from "@/lib/usage/ingest"

type TokenUsageShape = Record<string, unknown>

type CcusageCodexDay = {
  date?: string
  totalCost?: number
  costUSD?: number
  totalTokens?: number
  inputTokens?: number
  outputTokens?: number
  cacheCreationTokens?: number
  cacheReadTokens?: number
  calls?: number
  requestCount?: number
  requests?: number
  entries?: number
  sessionCount?: number
  models?: string[]
  modelsUsed?: string[]
  modelBreakdowns?: Array<{
    model?: string
    modelName?: string
    totalCost?: number
    costUSD?: number
    totalTokens?: number
    inputTokens?: number
    outputTokens?: number
    cacheCreationTokens?: number
    cacheReadTokens?: number
    calls?: number
    requestCount?: number
    isFallback?: boolean
  }>
}

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
  analyzer: "ccusage-codex" | "native"
  analyzerStatus?: "ok" | "missing" | "failed"
  analyzerError?: string
}

const DEFAULT_CODEX_DIR = ".codex"
const execFileAsync = promisify(execFile)

const MODEL_BUCKET_PRICING_PER_MILLION = {
  gpt55: {
    input: 5,
    cachedInput: 0.5,
    output: 30,
    reasoningOutput: 30,
  },
  gpt54: {
    input: 2.5,
    cachedInput: 0.25,
    output: 15,
    reasoningOutput: 15,
  },
  gpt54Mini: {
    input: 0.75,
    cachedInput: 0.075,
    output: 4.5,
    reasoningOutput: 4.5,
  },
  gpt54Nano: {
    input: 0.2,
    cachedInput: 0.02,
    output: 1.25,
    reasoningOutput: 1.25,
  },
  gpt53Codex: {
    input: 1.75,
    cachedInput: 0.175,
    output: 14,
    reasoningOutput: 14,
  },
  gpt52Codex: {
    input: 1.75,
    cachedInput: 0.175,
    output: 14,
    reasoningOutput: 14,
  },
  gpt52: {
    input: 1.75,
    cachedInput: 0.175,
    output: 14,
    reasoningOutput: 14,
  },
  gpt51CodexMax: {
    input: 1.25,
    cachedInput: 0.125,
    output: 10,
    reasoningOutput: 10,
  },
  gpt51Codex: {
    input: 1.25,
    cachedInput: 0.125,
    output: 10,
    reasoningOutput: 10,
  },
  gpt51CodexMini: {
    input: 0.25,
    cachedInput: 0.025,
    output: 2,
    reasoningOutput: 2,
  },
  codexMiniLatest: {
    input: 1.5,
    cachedInput: 0.375,
    output: 6,
    reasoningOutput: 6,
  },
} as const

const MODEL_MATCHERS: Array<{
  match: string
  bucket: keyof typeof MODEL_BUCKET_PRICING_PER_MILLION
}> = [
  { match: "gpt-5-5", bucket: "gpt55" },
  { match: "gpt-5-4-nano", bucket: "gpt54Nano" },
  { match: "gpt-5-4-mini", bucket: "gpt54Mini" },
  { match: "gpt-5-4", bucket: "gpt54" },
  { match: "gpt-5-3-codex", bucket: "gpt53Codex" },
  { match: "gpt-5-2-codex", bucket: "gpt52Codex" },
  { match: "gpt-5-2", bucket: "gpt52" },
  { match: "gpt-5-1-codex-max", bucket: "gpt51CodexMax" },
  { match: "gpt-5-1-codex-mini", bucket: "gpt51CodexMini" },
  { match: "gpt-5-1-codex", bucket: "gpt51Codex" },
  { match: "gpt-5-codex", bucket: "gpt51Codex" },
  { match: "codex-mini-latest", bucket: "codexMiniLatest" },
  { match: "codex-mini", bucket: "codexMiniLatest" },
]

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeModelName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function isGenericCodexModel(model: string) {
  return normalizeModelName(model) === "codex"
}

function getDefaultCodexPath() {
  const home = process.env.HOME ?? process.env.USERPROFILE

  if (!home) {
    throw new Error("Unable to resolve the home directory")
  }

  return path.join(/*turbopackIgnore: true*/ home, DEFAULT_CODEX_DIR)
}

function getCcusageBinaryNames() {
  return process.platform === "win32"
    ? ["ccusage-codex.cmd", "ccusage-codex"]
    : ["ccusage-codex"]
}

function getLocalCcusageBinaries() {
  return getCcusageBinaryNames().map((name) =>
    path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      "node_modules",
      ".bin",
      name
    )
  )
}

function getGlobalNpmCcusageBinaries() {
  const roots = [
    process.env.APPDATA
      ? path.join(/*turbopackIgnore: true*/ process.env.APPDATA, "npm")
      : null,
    process.env.npm_config_prefix
      ? path.join(/*turbopackIgnore: true*/ process.env.npm_config_prefix)
      : null,
  ].filter(Boolean) as string[]

  return roots.flatMap((root) =>
    getCcusageBinaryNames().map((name) =>
      path.join(/*turbopackIgnore: true*/ root, name)
    )
  )
}

function getCcusageCommands() {
  const configuredCommand = process.env.KOSH_CODEX_USAGE_COMMAND
  const commands: Array<{ command: string; args: string[]; label: string }> = []

  if (configuredCommand) {
    commands.push({
      command: configuredCommand,
      args: ["daily", "--json"],
      label: "KOSH_CODEX_USAGE_COMMAND",
    })
  }

  for (const localBinary of getLocalCcusageBinaries()) {
    if (existsSync(/*turbopackIgnore: true*/ localBinary)) {
      commands.push({
        command: localBinary,
        args: ["daily", "--json"],
        label: "local ccusage-codex",
      })
    }
  }

  for (const globalBinary of getGlobalNpmCcusageBinaries()) {
    if (existsSync(/*turbopackIgnore: true*/ globalBinary)) {
      commands.push({
        command: globalBinary,
        args: ["daily", "--json"],
        label: "global ccusage-codex",
      })
    }
  }

  commands.push({
    command: process.platform === "win32" ? "ccusage-codex.cmd" : "ccusage-codex",
    args: ["daily", "--json"],
    label: "PATH ccusage-codex",
  })

  return commands
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

function getCcusageTotalTokens(day: CcusageCodexDay) {
  return (
    toNumber(day.totalTokens) ||
    toNumber(day.inputTokens) +
      toNumber(day.outputTokens) +
      toNumber(day.cacheCreationTokens) +
      toNumber(day.cacheReadTokens)
  )
}

function getCcusageCalls(day: CcusageCodexDay) {
  return (
    toNumber(day.calls) ||
    toNumber(day.requestCount) ||
    toNumber(day.requests) ||
    toNumber(day.entries) ||
    toNumber(day.sessionCount)
  )
}

function getCcusageDays(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return []
  }

  const report = payload as {
    daily?: CcusageCodexDay[]
    data?: CcusageCodexDay[]
  }

  if (Array.isArray(report.daily)) {
    return report.daily
  }

  if (Array.isArray(report.data)) {
    return report.data
  }

  return []
}

function toCcusageSamples(payload: unknown): UsageSampleInput[] {
  const samples: UsageSampleInput[] = []

  for (const day of getCcusageDays(payload)) {
    if (!day.date) {
      continue
    }

    const date = new Date(`${day.date}T12:00:00.000Z`)

    if (Number.isNaN(date.getTime())) {
      continue
    }

    const modelBreakdowns = Array.isArray(day.modelBreakdowns)
      ? day.modelBreakdowns
      : []

    if (modelBreakdowns.length > 0) {
      for (const breakdown of modelBreakdowns) {
        const model = breakdown.model ?? breakdown.modelName ?? "codex-estimate"
        const tokens =
          toNumber(breakdown.totalTokens) ||
          toNumber(breakdown.inputTokens) +
            toNumber(breakdown.outputTokens) +
            toNumber(breakdown.cacheCreationTokens) +
            toNumber(breakdown.cacheReadTokens)

        if (tokens <= 0) {
          continue
        }

        samples.push({
          externalId: `ccusage-codex:${day.date}:${model}`,
          date,
          calls: toNumber(breakdown.calls) || toNumber(breakdown.requestCount),
          cost: toNumber(breakdown.costUSD ?? breakdown.totalCost),
          inputTokens:
            toNumber(breakdown.inputTokens) + toNumber(breakdown.cacheReadTokens),
          outputTokens: toNumber(breakdown.outputTokens),
          tokens,
          model,
          metadata: {
            analyzer: "ccusage-codex",
            costSource: "estimated",
            isFallback: breakdown.isFallback ?? false,
            cacheCreationTokens: toNumber(breakdown.cacheCreationTokens),
            cacheReadTokens: toNumber(breakdown.cacheReadTokens),
          },
        })
      }

      continue
    }

    const tokens = getCcusageTotalTokens(day)

    if (tokens <= 0) {
      continue
    }

    samples.push({
      externalId: `ccusage-codex:${day.date}`,
      date,
      calls: getCcusageCalls(day),
      cost: toNumber(day.costUSD ?? day.totalCost),
      inputTokens: toNumber(day.inputTokens) + toNumber(day.cacheReadTokens),
      outputTokens: toNumber(day.outputTokens),
      tokens,
      model: (day.modelsUsed ?? day.models ?? []).join(", ") || "codex-estimate",
      metadata: {
        analyzer: "ccusage-codex",
        costSource: "estimated",
        cacheCreationTokens: toNumber(day.cacheCreationTokens),
        cacheReadTokens: toNumber(day.cacheReadTokens),
      },
    })
  }

  return samples
}

function getPricingForModel(model: string) {
  const normalizedModel = normalizeModelName(model)

  return MODEL_MATCHERS.find(
    (entry) =>
      normalizedModel === entry.match ||
      normalizedModel.startsWith(`${entry.match}-`) ||
      normalizedModel.startsWith(`${entry.match}_`)
  )
}

function estimateCostUsd(model: string, usage: TokenUsageShape) {
  const pricingMatch = getPricingForModel(model)

  if (!pricingMatch) {
    return null
  }

  const pricing = MODEL_BUCKET_PRICING_PER_MILLION[pricingMatch.bucket]

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
  const explicitCost = entry.costUSD ?? entry.cost_usd

  if (
    isGenericCodexModel(model) &&
    (explicitCost === undefined || explicitCost === null)
  ) {
    return null
  }

  const inputTokens = getInputTokens(usage) + getCachedInputTokens(usage)
  const outputTokens = getOutputTokens(usage) + getReasoningOutputTokens(usage)
  const estimatedCost =
    explicitCost === undefined || explicitCost === null
      ? estimateCostUsd(model, usage)
      : null
  const costSource =
    explicitCost !== undefined && explicitCost !== null
      ? "explicit"
      : estimatedCost !== null
        ? "estimated"
        : "unknown"
  const totalUsage = entry.payload?.info?.total_token_usage ?? null

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
      pricingModel: getPricingForModel(model)?.match ?? null,
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

async function clearExistingCodexUsage() {
  const source = await db.usageSource.findFirst({
    where: {
      sourceType: "local_tool",
      provider: "Codex",
      collectionMethod: "local_logs",
    },
    select: { id: true },
  })

  if (!source) {
    return
  }

  await db.$transaction([
    db.usageDailyRollup.deleteMany({
      where: { usageSourceId: source.id },
    }),
    db.usageEvent.deleteMany({
      where: { usageSourceId: source.id },
    }),
  ])
}

async function importCodexUsageFromCcusage(sourcePath: string) {
  let lastError: string | null = null

  for (const candidate of getCcusageCommands()) {
    try {
      const { stdout } = await execFileAsync(candidate.command, candidate.args, {
        env: {
          ...process.env,
          CODEX_HOME: sourcePath,
          LOG_LEVEL: process.env.LOG_LEVEL ?? "0",
        },
        maxBuffer: 20 * 1024 * 1024,
        windowsHide: true,
        timeout: 30_000,
      })
      const payload = JSON.parse(stdout)
      const samples = toCcusageSamples(payload)

      await clearExistingCodexUsage()

      await ingestUsage({
        source: {
          name: "Codex estimated usage",
          sourceType: "local_tool",
          provider: "Codex",
          collectionMethod: "local_logs",
          accuracy: "estimated",
          privacyNote:
            "Reads Codex usage estimates from a locally installed ccusage-codex analyzer. Prompts and responses are not stored.",
          metadata: {
            analyzer: "ccusage-codex",
            analyzerCommand: candidate.label,
            sourcePathHash: createHash("sha256").update(sourcePath).digest("hex"),
            filesScanned: 0,
            entriesScanned: samples.length,
            entriesImported: samples.length,
            lastImportedAt: new Date().toISOString(),
            costSource: "estimated",
          },
        },
        samples,
      })

      return {
        filesScanned: 0,
        entriesScanned: samples.length,
        entriesImported: samples.length,
        sourcePath,
        analyzer: "ccusage-codex",
        analyzerStatus: "ok",
      } satisfies CodexImportResult
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "ENOENT"
      ) {
        lastError = `${candidate.label} was not found`
        continue
      }

      lastError =
        error instanceof Error
          ? `${candidate.label}: ${error.message}`
          : `${candidate.label}: ccusage-codex failed`
    }
  }

  return {
    filesScanned: 0,
    entriesScanned: 0,
    entriesImported: 0,
    sourcePath,
    analyzer: "ccusage-codex",
    analyzerStatus: lastError?.includes("not found") ? "missing" : "failed",
    analyzerError: lastError ?? "ccusage-codex was not found",
  } satisfies CodexImportResult
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

  const ccusageResult = await importCodexUsageFromCcusage(sourcePath)

  if (ccusageResult.analyzerStatus === "ok") {
    return ccusageResult
  }

  const files = await findJsonlFiles(sourcePath)
  let entriesScanned = 0
  const samples: UsageSampleInput[] = []

  for (const file of files) {
    const result = await parseCodexJsonlFile(file)
    entriesScanned += result.entriesScanned
    samples.push(...result.samples)
  }

  await clearExistingCodexUsage()

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
        analyzer: "native",
        analyzerStatus: ccusageResult.analyzerStatus,
        analyzerError: ccusageResult.analyzerError,
      },
    },
    samples,
  })

  return {
    filesScanned: files.length,
    entriesScanned,
    entriesImported: samples.length,
    sourcePath,
    analyzer: "native",
    analyzerStatus: ccusageResult.analyzerStatus,
    analyzerError: ccusageResult.analyzerError,
  } satisfies CodexImportResult
}
