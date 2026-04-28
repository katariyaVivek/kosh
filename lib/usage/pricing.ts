import { mkdir, readFile, writeFile } from "fs/promises"
import { homedir } from "os"
import path from "path"

export type TokenCounts = {
  input: number
  output: number
  cacheWrite: number
  cacheRead: number
}

export type ModelPricing = {
  input: number
  output: number
  cacheCreate: number
  cacheRead: number
}

type LiteLLMEntry = {
  input_cost_per_token?: number
  output_cost_per_token?: number
  cache_creation_input_token_cost?: number
  cache_read_input_token_cost?: number
}

const FALLBACK_PRICING: Record<string, ModelPricing> = {
  "claude-opus-4-7": { input: 5, output: 25, cacheCreate: 6.25, cacheRead: 0.5 },
  "claude-opus-4-6": { input: 5, output: 25, cacheCreate: 6.25, cacheRead: 0.5 },
  "claude-opus-4-5": { input: 5, output: 25, cacheCreate: 6.25, cacheRead: 0.5 },
  "claude-opus-4": { input: 15, output: 75, cacheCreate: 18.75, cacheRead: 1.5 },
  "claude-sonnet-4-6": { input: 3, output: 15, cacheCreate: 3.75, cacheRead: 0.3 },
  "claude-sonnet-4-5": { input: 3, output: 15, cacheCreate: 3.75, cacheRead: 0.3 },
  "claude-sonnet-4": { input: 3, output: 15, cacheCreate: 3.75, cacheRead: 0.3 },
  "claude-sonnet-3-7": { input: 3, output: 15, cacheCreate: 3.75, cacheRead: 0.3 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheCreate: 1.25, cacheRead: 0.1 },
  "claude-haiku-3-5": { input: 0.8, output: 4, cacheCreate: 1, cacheRead: 0.08 },
  "gpt-5": { input: 3, output: 12, cacheCreate: 3.75, cacheRead: 0.3 },
  "gpt-4-5": { input: 75, output: 150, cacheCreate: 93.75, cacheRead: 7.5 },
  "gpt-4o": { input: 2.5, output: 10, cacheCreate: 3.13, cacheRead: 0.25 },
  "o4": { input: 10, output: 40, cacheCreate: 12.5, cacheRead: 1 },
  "o3": { input: 10, output: 40, cacheCreate: 12.5, cacheRead: 1 },
  "o1": { input: 15, output: 60, cacheCreate: 18.75, cacheRead: 1.5 },
  "deepseek": { input: 0.9, output: 3.6, cacheCreate: 0.9, cacheRead: 0.09 },
  "gemini-2.5-pro": { input: 1.25, output: 10, cacheCreate: 0.63, cacheRead: 0.31 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5, cacheCreate: 0.15, cacheRead: 0.08 },
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const LITELLM_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json"

function getCacheDir(): string {
  const home = homedir()
  const dataHome = process.env.XDG_DATA_HOME ?? path.join(home, ".local", "share")
  return path.join(dataHome, "kosh", "cache")
}

function getCachePath(): string {
  return path.join(getCacheDir(), "litellm-pricing.json")
}

function parseLiteLLMEntry(entry: LiteLLMEntry): ModelPricing | null {
  if (entry.input_cost_per_token === undefined || entry.output_cost_per_token === undefined) {
    return null
  }
  return {
    input: entry.input_cost_per_token * 1_000_000,
    output: entry.output_cost_per_token * 1_000_000,
    cacheCreate: (entry.cache_creation_input_token_cost ?? entry.input_cost_per_token * 1.25) * 1_000_000,
    cacheRead: (entry.cache_read_input_token_cost ?? entry.input_cost_per_token * 0.1) * 1_000_000,
  }
}

async function fetchAndCachePricing(): Promise<Map<string, ModelPricing>> {
  const response = await fetch(LITELLM_URL)
  if (!response.ok) throw new Error(`LiteLLM pricing fetch failed: HTTP ${response.status}`)
  const data = (await response.json()) as Record<string, LiteLLMEntry>
  const pricing = new Map<string, ModelPricing>()

  for (const [name, entry] of Object.entries(data)) {
    const costs = parseLiteLLMEntry(entry)
    if (!costs) continue
    pricing.set(name, costs)
    const stripped = name.replace(/^[^/]+\//, "")
    if (stripped !== name && !pricing.has(stripped)) {
      pricing.set(stripped, costs)
    }
  }

  await mkdir(getCacheDir(), { recursive: true })
  await writeFile(
    getCachePath(),
    JSON.stringify({ timestamp: Date.now(), data: Array.from(pricing.entries()) }),
  )

  return pricing
}

async function loadCachedPricing(): Promise<Map<string, ModelPricing> | null> {
  try {
    const raw = await readFile(getCachePath(), "utf-8")
    const cached = JSON.parse(raw) as {
      timestamp: number
      data: [string, ModelPricing][]
    }
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) return null
    return new Map(cached.data)
  } catch {
    return null
  }
}

let pricingCache: Map<string, ModelPricing> | null = null

export async function loadPricing(): Promise<Map<string, ModelPricing>> {
  if (pricingCache) return pricingCache

  const cached = await loadCachedPricing()
  if (cached) {
    pricingCache = cached
    return cached
  }

  try {
    pricingCache = await fetchAndCachePricing()
  } catch {
    pricingCache = new Map()
  }

  return pricingCache
}

export function normalizeModelName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function getCanonicalName(model: string): string {
  return model
    .replace(/@.*$/, "")
    .replace(/-\d{8}$/, "")
    .replace(/^[^/]+\//, "")
}

export function findPricing(
  pricing: Map<string, ModelPricing>,
  model: string,
): ModelPricing | null {
  const canonical = getCanonicalName(normalizeModelName(model))

  if (pricing.has(canonical)) return pricing.get(canonical)!

  for (const [key, costs] of pricing) {
    if (canonical === key || canonical.startsWith(key)) return costs
  }

  for (const [key, costs] of Object.entries(FALLBACK_PRICING)) {
    if (canonical === key || canonical.startsWith(key)) return costs
  }

  return null
}

export function estimateCostUsd(
  pricing: Map<string, ModelPricing>,
  model: string,
  tokens: TokenCounts,
): number | null {
  const modelPricing = findPricing(pricing, model)
  if (!modelPricing) return null

  return (
    (tokens.input * modelPricing.input +
      tokens.output * modelPricing.output +
      tokens.cacheWrite * modelPricing.cacheCreate +
      tokens.cacheRead * modelPricing.cacheRead) /
    1_000_000
  )
}
