# 🏛️ Kosh

**Your local-first API key treasury.**

Kosh is a beautiful, secure, self-hosted API key manager built for developers. Store, organize, and monitor all your API keys in one place — encrypted at rest, never leaving your machine.

![Kosh Dashboard](./public/screenshots/dashboard.png)

## ✨ Features

- 🔐 **AES-256 encryption** — all keys encrypted at rest using your master key
- 🏛️ **Vault** — add, edit, delete and organize API keys by platform and project
- 📝 **Notes** — attach optional notes to any API key for context, visible in dialogs, vault cards, and dashboard
- 📊 **Pulse** — track usage, costs, and API call history per key
- 📈 **Spend Over Time** — visualize daily costs and API call volume over the last 30 days
- 🔔 **Alerts** — set cost or call thresholds and get notified when crossed
- 🔌 **Connector system** — validate and sync keys from OpenRouter, Groq, Gemini, NVIDIA NIM, Anthropic, OpenAI, Replicate, Together AI, Mistral, and more
- 🩺 **Health Check** — validate all keys at once with real-time progress
- 🔘 **Bulk operations** — select multiple keys to validate or delete in one click
- ⌨️ **Keyboard shortcuts** — `N` new key, `/` search, `H` health check, `L` lock vault
- 🔔 **Toast notifications** — instant feedback for every action (copy, delete, sync, etc.)
- 🎨 **Beautiful UI** — clean light/dark mode design inspired by Clerk and Resend
- 🚀 **First-run setup** — guided setup generates your master key automatically
- 📤 **Export/Import** — backup and restore your vault as encrypted JSON
- 🔒 **Local-first** — all data stays on your machine, zero telemetry

## 🛠️ Tech Stack

- **Framework** — Next.js 15 (App Router)
- **Database** — SQLite via Prisma
- **UI** — shadcn/ui + Tailwind CSS
- **Encryption** — AES-256 via crypto-js
- **Charts** — Recharts
- **Icons** — Lucide React

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Local Development

1. **Clone and install**
   ```bash
   git clone https://github.com/katariyaVivek/kosh.git
   cd kosh
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set a strong `KOSH_MASTER_KEY` (at least 12 chars, 64+ recommended).  
   Generate one with: `openssl rand -hex 32`

3. **Initialize the database**
   ```bash
   npx prisma migrate dev
   ```

4. **Start the dev server**
   ```bash
   npm run dev
   ```

5. **Open Kosh**
   Visit [http://localhost:3000](http://localhost:3000) — your keys will be encrypted with the master key from `.env`.

### 🐳 Docker (Recommended for Self-Hosting)

**Option A: Docker Compose (easiest)**

1. Clone and set up env:
   ```bash
   git clone https://github.com/katariyaVivek/kosh.git
   cd kosh
   cp .env.example .env
   ```

2. Edit `.env` and set `KOSH_MASTER_KEY`:
   ```env
   KOSH_MASTER_KEY=your-64-char-random-key
   ```

3. Build and run:
   ```bash
   docker compose up --build -d
   ```

4. Open [http://localhost:3000](http://localhost:3000)

**Option B: Plain Docker**

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

**Updating (Docker Compose)**

```bash
git pull
docker compose down
docker compose up --build -d
```

**Troubleshooting**
- **Readonly database error**: Your Docker volume has wrong permissions. Remove it and rebuild:
  ```bash
  docker compose down -v
  docker compose up --build -d
  ```
  *(Warning: this deletes your data. Back up first if needed.)*

## 🔐 Security

Kosh uses AES-256 encryption to protect all stored API keys. Your `KOSH_MASTER_KEY` is stored in your local `.env` file and never leaves your machine.

**Important:**
- Never commit your `.env` file to version control
- Back up your `KOSH_MASTER_KEY` somewhere safe — losing it means losing access to your encrypted keys
- The `.env` file is included in `.gitignore` by default

## ⚙️ Configuration

After first-run setup, your `.env` file will contain:
```env
DATABASE_URL="file:./kosh.db"
KOSH_MASTER_KEY="your-generated-master-key"
```

**With Docker**, the database is stored in a volume at `/app/data/kosh.db`. The master key can also be stored in `data/master.key` for automatic rotation support.

## 🔌 Supported Platforms

| Platform | Validate | Auto-sync |
|---|---|---|
| OpenRouter | ✅ | ✅ |
| OpenAI | ✅ | ✅ |
| Groq | ✅ | — |
| Google Gemini | ✅ | — |
| NVIDIA NIM | ✅ | — |
| Anthropic | ✅ | — |
| Stripe | ✅ | ✅ |
| Replicate | ✅ | ✅ |
| Together AI | ✅ | ✅ |
| Mistral | ✅ | — |
| Any other | — | Manual |

## 🔧 API Endpoints

- `POST /api/health-check` — validate all API keys sequentially; returns each key’s id, name, platform, and valid status (true, false, or unknown).
- `POST /api/keys` — create a new API key (supports optional `notes` field).
- `PATCH /api/keys/[id]` — update an existing API key, including its `notes`.
- `GET /api/keys/[id]/details` — retrieve key details with `notes`, usage logs, and aggregates.
- `GET /api/dashboard/chart` — fetch 30-day grouped cost and call metrics for the dashboard chart.

## 📁 Project Structure

```text
kosh/
├── app/                   # Next.js App Router pages
│   ├── page.tsx           # Dashboard
│   ├── vault/             # Vault page
│   ├── pulse/             # Pulse page
│   ├── alerts/            # Alerts page
│   ├── settings/          # Settings page
│   ├── setup/             # First-run setup
│   └── api/               # API routes (health-check, dashboard/chart, sync, alerts, settings, etc.)
├── components/            # React components
├── lib/
│   ├── connectors/        # Platform connector system
│   ├── encryption.ts      # AES-256 encryption
│   ├── platform-config.ts # Platform colors & initials
│   └── db.ts              # Prisma client
└── prisma/
    └── schema.prisma      # Database schema
```

## 🗺️ Roadmap

- [x] Docker support for self-hosting
- [x] Master key rotation (re-encrypt all keys)
- [x] Auto-lock vault on inactivity
- [x] Key rotation reminders
- [x] More platform connectors (Replicate, Together AI, Mistral)
- [ ] Kosh Cloud (optional cloud sync)

## 📄 License

MIT — free to use, modify, and self-host.

---

Built with ❤️ by a solo vibe coder. If Kosh saves you time, consider giving it a ⭐
