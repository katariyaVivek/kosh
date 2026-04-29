# Kosh

Local-first API key treasury and AI usage monitor for developers.

Kosh stores API keys locally, encrypts secrets at rest, tracks provider usage where APIs allow it, and imports local Codex, Claude Code, and OpenCode usage without storing prompts or responses.

![Kosh dashboard](./public/screenshots/dashboard.png)

## What Kosh Does

- **Encrypted API key vault** with platform, environment, notes, rotation metadata, and copy/reveal controls.
- **Usage dashboard** for cost, calls, and token trends across API keys and local AI tools.
- **Local AI usage imports** from Codex (`~/.codex/`), Claude Code (`~/.claude/`), and OpenCode (`~/.opencode/`) — all priced via shared LiteLLM pricing with automatic fallback for 700+ models.
- **Codex rate limit snapshots** from local auth or CLI status.
- **Pricing via LiteLLM** — shared pricing module with 24h cache and bundled fallback table, so Codex, Claude Code, and OpenCode all estimate costs consistently.
- **20 provider connectors** with a capability model reporting whether validation, usage sync, billing, or manual entry is supported.
- **Alerts** for cost, calls, and token thresholds across API keys or local AI usage sources.
- **Pulse view** for day-to-day usage, spend scanning, and per-key sparklines.
- **Vault view** with search, filtering, bulk selection, key rotation tracking, and expiry management.
- **Key rotation** — track rotation cycles, due dates, and overdue keys with color-coded badges.
- **Export/import backup flow** for vault metadata and usage history.
- **Theme-aware branding** with light/dark logo assets and a custom ThemeProvider that avoids `<script>` tag warnings.
- **Auto-lock**, light/dark/system appearance, command palette, onboarding tour, and lock screen.

## Data Model

Kosh separates three kinds of telemetry:

- **API key records**: encrypted credentials, metadata, rotation state, and provider validation status.
- **Usage history**: `UsageEvent` and `UsageDailyRollup` records for cost, calls, and tokens.
- **Quota snapshots**: `UsageQuotaSnapshot` records for live Codex rate-limit windows.

Local Codex, Claude Code, and OpenCode imports store token and cost metadata only. Kosh does not store prompts, responses, or transcript content.

## Tech Stack

- Next.js 16 App Router
- React 19
- Prisma 5 with SQLite
- Tailwind CSS and shadcn/ui components
- Recharts for sparklines and charts
- Lucide React icons
- crypto-js AES encryption
- LiteLLM pricing data (700+ models, 24h cached)

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Local Development

1. Install dependencies.

```bash
npm install
```

2. Bootstrap the local install.

```bash
npm run bootstrap
```

3. Start the app.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

```bash
docker compose up --build -d
```

For plain Docker:

```bash
docker build -t kosh .
docker run -d \
  -p 3000:3000 \
  -e KOSH_MASTER_KEY="your-key-here" \
  -e DATABASE_URL="file:/app/data/kosh.db" \
  -v kosh_data:/app/data \
  --name kosh \
  kosh
```

## Supported Providers

| Provider | Validate | Usage sync | Notes |
| --- | --- | --- | --- |
| OpenAI | Yes | Yes | Usage support depends on key/account capabilities. |
| Anthropic | Yes | Partial | Local Claude Code import is separate from API key usage. |
| OpenRouter | Yes | Yes | Supports usage and rate-limit metadata where available. |
| OpenCode | Manual | Local import | Reads local SQLite usage metadata. |
| DeepSeek | Yes | Partial | Validation supported. |
| Perplexity | Yes | Partial | Validation supported. |
| Cohere | Yes | Partial | Validation supported. |
| Cerebras | Yes | Partial | Validation supported. |
| DeepInfra | Yes | Partial | Validation supported. |
| Alibaba (Qwen) | Yes | Partial | Validation supported. |
| Venice AI | Yes | Partial | Validation supported. |
| GitHub Copilot | Yes | Partial | Validation supported. |
| GitLab Duo | Yes | Partial | Validation supported. |
| Groq | Yes | Manual | Validation supported; usage is manual unless provider APIs expose it. |
| Google Gemini | Yes | Manual | Validation supported. |
| NVIDIA NIM | Yes | Manual | Usage data is not exposed consistently. |
| Stripe | Yes | Yes | Billing-oriented connector. |
| Replicate | Yes | Yes | Usage sync where account APIs allow it. |
| Together AI | Yes | Yes | Usage sync where account APIs allow it. |
| Mistral | Yes | Manual | Validation supported. |
| X.ai | Yes | Manual | Validation supported. |
| Other | Manual | Manual | Store and track manually. |
| Codex | Local auth/logs | Local import + quota | Reads local metadata via bundled `@ccusage/codex` analyzer. |
| Claude Code | Local logs | Local import | Reads local usage metadata. |

## Local AI Usage

Kosh can import local AI usage from:

- `~/.codex/**/*.jsonl`
- `~/.claude/projects/**/*.jsonl`
- `~/.opencode/**/*.sqlite`

All three sources use a **shared pricing module** backed by LiteLLM (700+ models, 24h cached). The module falls back to a bundled table of ~16 common models when offline. This means cost estimates stay consistent whether you're using Codex, Claude Code, or OpenCode — and match tools like `ccusage` and `codeburn`.

For Codex token and spend estimates, Kosh uses the bundled `@ccusage/codex` analyzer and imports its JSON daily report. These values are labeled as estimated because they are API-equivalent cost estimates, not exact ChatGPT subscription billing.

If you need to override the bundled analyzer, point Kosh at a specific binary with `KOSH_CODEX_USAGE_COMMAND`.

For Codex quota, Kosh has a separate quota refresh path. It can use local Codex auth or CLI status. OAuth quota refresh sends the local Codex bearer token to OpenAI to read rate-limit windows; the UI labels this explicitly before use.

## API Routes

- `POST /api/keys` — Create a new API key record
- `PATCH /api/keys/[id]` — Update key metadata or rotation
- `GET /api/keys/[id]/details` — Key detail with usage history
- `POST /api/sync/[id]` — Sync usage from provider API
- `POST /api/usage` — Ingest usage events
- `GET /api/dashboard/chart` — 30-day spend/calls chart data
- `POST /api/usage-sources/local/refresh` — Refresh all local sources (Codex, Claude Code, OpenCode)
- `GET /api/usage-sources/local/[provider]/details` — Per-source detail
- `POST /api/usage-sources/codex/quota` — Codex rate limit snapshot
- `POST /api/alerts` — Create alert
- `PATCH /api/alerts/[id]/reset` — Reset triggered alert
- `DELETE /api/alerts/[id]` — Delete alert
- `GET /api/settings/export` — Export vault and usage backup
- `POST /api/settings/import` — Import backup

## Views

Kosh has six main views:

- **Dashboard** — Metric overview, spend telemetry chart, local source summary cards, and key table with search.
- **Pulse** — Per-source and per-key usage breakdown with 7-day sparklines, cost/calls/tokens, and sync controls.
- **Vault** — Encrypted key treasury with search, filtering, bulk selection, rotation tracking, and expiry badges.
- **Alerts** — Configure and manage cost, calls, and token threshold alerts across keys and local sources.
- **Settings** — Security (master key, auto-lock), data management (export/import), appearance (light/dark/system), and danger zone.
- **Setup** — One-time local bootstrap with onboarding instructions.

## Project Structure

```text
kosh/
  app/                    Next.js routes and API handlers
  components/             UI and workflow components
    ui/                   shadcn/ui base components
  lib/
    connectors/           20 provider connectors with capability metadata
    usage/                Import, rollup, pricing, and quota helpers
  prisma/                 Schema and migrations
  public/
    branding/             Theme-aware kosh logo assets (dark/light)
    screenshots/          README screenshots
```

## Security Notes

- Never commit `.env`.
- Back up `KOSH_MASTER_KEY`; losing it means losing access to encrypted keys.
- Local usage imports store token/cost metadata, not prompt or response content.
- Exported backups exclude decrypted key values.

## License

MIT
