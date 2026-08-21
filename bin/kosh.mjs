#!/usr/bin/env node
/**
 * Kosh CLI launcher.
 *
 *   kosh                 ensure setup + start the server (default)
 *   kosh bootstrap       run first-time setup only (keys, DB, credentials)
 *   kosh build           production-build only
 *   kosh --port 4000     start on a specific port
 *   kosh --dir <path>    store data somewhere other than ~/.kosh
 *   kosh --no-open       do not open the browser automatically
 *
 * Storage: everything user-owned (master key, databases, provider credential
 * cache) lives under KOSH_HOME — default ~/.kosh — NEVER inside the npm
 * package folder, so `npm update` can never wipe your keys.
 */

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { fileURLToPath } from "node:url";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--port" || a === "-p") flags.port = args[++i];
  else if (a === "--dir") flags.dir = args[++i];
  else if (a === "--no-open") flags.noOpen = true;
  else if (a === "--version" || a === "-v") flags.version = true;
  else if (a === "--help" || a === "-h") flags.help = true;
  else positional.push(a);
}

const command = positional[0] || "start";

function readPkgVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(pkgRoot, "package.json"), "utf8")).version;
  } catch {
    return "unknown";
  }
}

if (flags.version) {
  console.log(`kosh ${readPkgVersion()}`);
  process.exit(0);
}

if (flags.help) {
  console.log(`
  kosh — local-first API key treasury, usage monitor & AI gateway

  Usage
    kosh                    setup (first run) + start the server
    kosh bootstrap          run first-time setup only
    kosh build              create/refresh the production build
    kosh --port 4000        choose a port (default 3000, or KOSH_PORT)
    kosh --dir <path>       store data in <path> instead of ~/.kosh
    kosh --no-open          don't open the browser automatically

  Data location
    All keys and databases live under KOSH_HOME (default ~/.kosh),
    never inside the npm package, so updates are always safe.
`);
  process.exit(0);
}

// --- environment -----------------------------------------------------------

function toPosix(p) {
  return p.split(path.sep).join("/");
}

const homeDir = path.resolve(flags.dir || process.env.KOSH_HOME || path.join(os.homedir(), ".kosh"));
fs.mkdirSync(homeDir, { recursive: true });
fs.mkdirSync(path.join(homeDir, "data"), { recursive: true });

const childEnvBase = {
  ...process.env,
  KOSH_HOME: homeDir,
  // Gateway + MITM storage follow DATA_DIR (already supported upstream).
  DATA_DIR: process.env.DATA_DIR || path.join(homeDir, "data", "gateway"),
};

/** Parse simple KEY=VALUE .env files (used to pass config to the server). */
function parseEnvFile(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* none yet */ }
  return out;
}

function run(cmd, cmdArgs, { label, env = {} } = {}) {
  console.log(`\n[kosh] ${label || cmd}`);
  const res = spawnSync(process.execPath, [cmd, ...cmdArgs], {
    cwd: pkgRoot,
    stdio: "inherit",
    env: { ...childEnvBase, ...env },
  });
  if (res.status !== 0) {
    console.error(`\n[kosh] "${label || cmd}" failed (exit ${res.status}).`);
    process.exit(res.status || 1);
  }
}

const bootstrapScript = path.join(pkgRoot, "scripts", "bootstrap.mjs");
const nextBin = path.join(pkgRoot, "node_modules", "next", "dist", "bin", "next");

function ensureInstalled() {
  if (!fs.existsSync(nextBin)) {
    console.error("[kosh] Dependencies missing. Fix with:\n\n    npm i -g kosh-treasury --force\n");
    process.exit(1);
  }
}

/**
 * Start the production server. Prefers the standalone server (identical to
 * Docker's runtime); falls back to `next start` for non-standalone builds.
 */
async function startServer({ port, serverEnv }) {
  const standaloneDir = path.join(pkgRoot, ".next", "standalone");
  const serverJs = path.join(standaloneDir, "server.js");

  if (fs.existsSync(serverJs)) {
    // Standalone builds need static assets mirrored next to server.js.
    try {
      fs.cpSync(path.join(pkgRoot, "public"), path.join(standaloneDir, "public"), { recursive: true });
      fs.cpSync(path.join(pkgRoot, ".next", "static"), path.join(standaloneDir, ".next", "static"), { recursive: true });
    } catch { /* best-effort */ }
    console.log("[kosh] Starting standalone server...");
    return spawn(process.execPath, [serverJs], {
      cwd: standaloneDir,
      env: { ...serverEnv, PORT: String(port), HOSTNAME: process.env.HOSTNAME || "0.0.0.0" },
      stdio: "inherit",
    });
  }

  console.log("[kosh] Starting server (next start)...");
  return spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: pkgRoot,
    env: serverEnv,
    stdio: "inherit",
  });
}

async function main() {
  if (!fs.existsSync(bootstrapScript)) {
    console.error("[kosh] Installation looks broken (scripts/bootstrap.mjs missing). Reinstall:");
    console.error("\n    npm i -g kosh-treasury --force\n");
    process.exit(1);
  }
  ensureInstalled();

  const major = Number(process.versions.node.split(".")[0]);
  if (major < 20) {
    console.warn(`[kosh] Node ${process.versions.node} detected. Node 20+ required; 22.5+ recommended.`);
  }

  if (command === "bootstrap") {
    run(bootstrapScript, [], { label: "Bootstrap (master key, databases, provider credentials)" });
    console.log(`\n[kosh] Setup complete. Data directory: ${homeDir}`);
    return;
  }

  if (command === "build") {
    run(nextBin, ["build"], { label: "Building Kosh..." });
    console.log("\n[kosh] Build complete.");
    return;
  }

  if (command !== "start") {
    console.error(`[kosh] Unknown command "${command}". Try: kosh --help`);
    process.exit(1);
  }

  // 1. First-run setup (idempotent: generates master key + .env on first run,
  //    applies pending migrations on every run).
  run(bootstrapScript, [], { label: "Setup & migrations (first run creates your master key)" });

  // 2. Production build on demand (one-time after install/update).
  const buildId = path.join(pkgRoot, ".next", "BUILD_ID");
  if (!fs.existsSync(buildId)) {
    run(nextBin, ["build"], { label: "First run: building Kosh (30-60s, one-time)..." });
  }

  // 3. Start the server with config from KOSH_HOME/.env injected.
  const port = String(flags.port || process.env.KOSH_PORT || 3000);
  const envFileVars = parseEnvFile(path.join(homeDir, ".env"));
  const serverEnv = {
    ...childEnvBase,
    ...envFileVars,
    DATABASE_URL: process.env.DATABASE_URL || envFileVars.DATABASE_URL || `file:${toPosix(path.join(homeDir, "kosh.db"))}`,
    PORT: port,
  };

  console.log(`\n  Kosh\n\n    URL:   http://localhost:${port}\n    Data:  ${homeDir}\n    Stop:  Ctrl+C\n`);

  const child = await startServer({ port, serverEnv });

  const waitForHealth = async () => {
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) return false;
      const ok = await new Promise((resolve) => {
        const req = http.get({ host: "127.0.0.1", port, path: "/api/health", timeout: 1500 }, (r) => {
          r.resume();
          resolve(r.statusCode && r.statusCode < 500);
        });
        req.on("error", () => resolve(false));
        req.on("timeout", () => { req.destroy(); resolve(false); });
      });
      if (ok) return true;
      await new Promise((r) => setTimeout(r, 700));
    }
    return false;
  };

  waitForHealth().then((healthy) => {
    if (!healthy) return;
    if (!flags.noOpen) {
      import("open").then((m) => m.default(`http://localhost:${port}`)).catch(() => {});
    }
  });

  const shutdown = () => {
    if (child.exitCode === null) child.kill();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error("[kosh]", err?.message || err);
  process.exit(1);
});
