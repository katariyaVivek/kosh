/**
 * Node backend for the provider credential resolver (providerCreds.js).
 *
 * Owns everything that requires Node built-ins: cache-file IO, install-dir
 * discovery, chunked binary scans, and token-endpoint probe validation.
 * Registers itself into the portable core on import, so server entry points
 * only need to import this module once (see src/instrumentation.js and
 * scripts/bootstrap.mjs).
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import {
  PROVIDERS,
  getCreds,
  __setBackend,
  __setCacheData,
} from "./providerCreds.js";

const CACHE_DIR = path.join(process.cwd(), "data");
const CACHE_FILE = path.join(CACHE_DIR, "provider-creds.json");

// ---------------------------------------------------------------------------
// Extraction primitives
// ---------------------------------------------------------------------------

const GOOGLE_ID_RE = /(\d{6,16}-[a-z0-9_]+\.apps\.googleusercontent\.com)/g;

/** All Google-style client ids with their offsets. */
function extractGoogleIds(text) {
  return [...text.matchAll(GOOGLE_ID_RE)].map((m) => ({ v: m[1], i: m.index }));
}

/**
 * All GOCSPX secrets with offsets. Scanned via literal indexOf + bounded run,
 * because consecutive secrets in string blobs concatenate seamlessly
 * ("GOCSPX-aaaGOCSPX-bbb") and a plain character-class regex would swallow both.
 */
function extractGoogleSecrets(text) {
  const out = [];
  let i = 0;
  while ((i = text.indexOf("GOCSPX-", i)) !== -1) {
    let e = i + 7;
    while (e < text.length && /[A-Za-z0-9_-]/.test(text[e]) && !text.startsWith("GOCSPX-", e)) e++;
    const v = text.slice(i, e);
    if (v.length >= 24 && v.length <= 60) out.push({ v, i });
    i += 7;
  }
  return out;
}

/**
 * Pair ids with secrets found within `maxGap` chars (packaged-JS layout).
 * Returns pairs sorted by tightness.
 */
function pairByProximity(ids, secrets, maxGap = 400) {
  const pairs = [];
  for (const id of ids) {
    let best = null;
    for (const s of secrets) {
      const d = Math.abs(s.i - id.i);
      if (d <= maxGap && (!best || d < best.d)) best = { ...s, d };
    }
    if (best) pairs.push({ clientId: id.v, clientSecret: best.v, score: 1 / (best.d + 1) });
  }
  return pairs.sort((a, b) => b.score - a.score);
}

/**
 * Probe a candidate id/secret pair against a Google-compatible token endpoint.
 * `invalid_client` -> combination is wrong; anything else (typically
 * `invalid_grant` for our bogus code) -> combination is plausible.
 */
async function googlePairPlausible(tokenUrl, clientId, clientSecret) {
  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: "kosh-credential-probe",
      grant_type: "authorization_code",
      redirect_uri: "http://localhost:1/kosh-probe",
    });
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => ({}));
    return data?.error !== "invalid_client";
  } catch {
    return false; // network unreachable -> cannot validate
  }
}

// ---------------------------------------------------------------------------
// File scanning
// ---------------------------------------------------------------------------

async function* walkFiles(dir, { maxDepth = 4, maxSize = 12 * 1024 * 1024, exts = null } = {}) {
  let entries;
  try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (maxDepth > 0 && e.name !== "node_modules" && !e.name.startsWith(".")) {
        yield* walkFiles(p, { maxDepth: maxDepth - 1, maxSize, exts });
      }
      continue;
    }
    if (!e.isFile()) continue;
    if (exts && !exts.has(path.extname(e.name).toLowerCase())) continue;
    try { if ((await fsp.stat(p)).size > maxSize) continue; } catch { continue; }
    yield p;
  }
}

/**
 * Chunked scan of a large/binary file. Overlap keeps boundary-spanning matches
 * intact. Returns raw candidates ({ids, secrets}) — pairing happens upstream.
 */
async function scanLargeFile(file, { chunkSize = 8 * 1024 * 1024, overlap = 4096 } = {}) {
  const fh = await fsp.open(file, "r").catch(() => null);
  if (!fh) return null;
  const ids = new Map();
  const secrets = new Map();
  try {
    const size = (await fh.stat()).size;
    for (let pos = 0; pos < size; pos += chunkSize - overlap) {
      const len = Math.min(chunkSize, size - pos);
      const buf = Buffer.alloc(len);
      const { bytesRead } = await fh.read(buf, 0, len, pos);
      if (!bytesRead) break;
      const text = buf.latin1Slice(0, bytesRead);
      for (const x of extractGoogleIds(text)) ids.set(x.v, x);
      for (const x of extractGoogleSecrets(text)) secrets.set(x.v, x);
    }
  } finally {
    await fh.close().catch(() => {});
  }
  return { ids: [...ids.values()], secrets: [...secrets.values()] };
}

async function scanTextFiles(files) {
  const ids = new Map();
  const secrets = new Map();
  for (const file of files) {
    let text;
    try { text = await fsp.readFile(file, "utf8"); } catch { continue; }
    for (const x of extractGoogleIds(text)) ids.set(x.v, x);
    for (const x of extractGoogleSecrets(text)) secrets.set(x.v, x);
  }
  return { ids: [...ids.values()], secrets: [...secrets.values()] };
}

function firstExisting(candidates) {
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch { /* ignore */ }
  }
  return null;
}

function home(...p) { return path.join(os.homedir(), ...p); }

// ---------------------------------------------------------------------------
// Per-provider detectors
// ---------------------------------------------------------------------------

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function antigravityBinaries() {
  const appData = process.env.LOCALAPPDATA || home("AppData", "Local");
  return [
    path.join(appData, "Programs", "Antigravity", "resources", "bin", "language_server.exe"),
    "/Applications/Antigravity.app/Contents/Resources/bin/language_server",
    "/Applications/Antigravity.app/Contents/Resources/app/bin/language_server",
    home(".local", "share", "antigravity", "resources", "bin", "language_server"),
    home(".antigravity", "bin", "language_server"),
  ];
}

async function detectAntigravity() {
  const bin = firstExisting(antigravityBinaries());
  if (!bin) return null;
  const { ids, secrets } = (await scanLargeFile(bin)) || {};
  if (!ids.length || !secrets.length) return null;

  // Single candidate on each side -> accept directly.
  if (ids.length === 1 && secrets.length === 1) {
    return { clientId: ids[0].v, clientSecret: secrets[0].v };
  }

  // Ambiguous (Go string blobs scatter related strings far apart) -> probe
  // combinations against the real token endpoint and keep the accepted pair.
  const combos = [];
  for (const id of ids.slice(0, 4)) {
    for (const s of secrets.slice(0, 3)) combos.push({ clientId: id.v, clientSecret: s.v });
  }
  for (const pair of combos) {
    if (await googlePairPlausible(GOOGLE_TOKEN_URL, pair.clientId, pair.clientSecret)) {
      return pair;
    }
  }
  return null;
}

async function npmGlobalRoot() {
  try {
    const { execFileSync } = await import("node:child_process");
    return execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["root", "-g"], {
      encoding: "utf8",
      timeout: 8000,
    }).trim();
  } catch {
    return null;
  }
}

async function geminiCliPackageDirs() {
  const dirs = [];
  const g = await npmGlobalRoot();
  if (g) dirs.push(path.join(g, "@google", "gemini-cli"));
  const npxCache =
    process.platform === "win32"
      ? process.env.LOCALAPPDATA
        ? path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx")
        : null
      : home(".npm", "_npx");
  if (npxCache) {
    let entries;
    try { entries = await fsp.readdir(npxCache); } catch { entries = []; }
    for (const e of entries) dirs.push(path.join(npxCache, e, "node_modules", "@google", "gemini-cli"));
  }
  const existing = [];
  for (const d of dirs) {
    try { if (fs.existsSync(d)) existing.push(d); } catch { /* ignore */ }
  }
  return existing;
}

async function detectGeminiCli() {
  for (const dir of await geminiCliPackageDirs()) {
    const files = [];
    for await (const f of walkFiles(dir, { maxDepth: 5, exts: new Set([".js", ".mjs", ".cjs", ".json"]) })) {
      files.push(f);
      if (files.length >= 400) break;
    }
    const { ids, secrets } = await scanTextFiles(files);
    if (!ids.length || !secrets.length) continue;
    // Packaged JS keeps id+secret adjacent; proximity pairing is reliable here.
    const pairs = pairByProximity(ids, secrets);
    if (pairs[0]) return { clientId: pairs[0].clientId, clientSecret: pairs[0].clientSecret };
  }
  return null;
}

async function detectWindsurf() {
  const appData = process.env.LOCALAPPDATA || home("AppData", "Local");
  const roots = [
    path.join(appData, "Programs", "Windsurf"),
    "/Applications/Windsurf.app/Contents/Resources",
    home(".windsurf"),
    home(".codeium", "windsurf"),
  ].filter((r) => { try { return fs.existsSync(r); } catch { return false; } });

  for (const root of roots) {
    for await (const file of walkFiles(root, { maxDepth: 3, exts: new Set([".json", ".js"]) })) {
      let text;
      try { text = await fsp.readFile(file, "utf8"); } catch { continue; }
      const fb = text.match(/\b(AIzaSy[A-Za-z0-9_-]{33})\b/);
      if (!fb) continue;
      if (!/windsurf|codeium/i.test(text)) continue;
      const cid = text.match(/["']?clientId["']?\s*:\s*["']([A-Za-z0-9_-]{20,40})["']/);
      return {
        clientId: cid ? cid[1] : "",
        clientSecret: fb[1], // Firebase web API key rides in the secret slot
        _incomplete: !cid,
      };
    }
  }
  return null;
}

async function detectIflow() {
  const g = await npmGlobalRoot();
  const roots = [];
  if (g) {
    try {
      for (const e of await fsp.readdir(g)) {
        if (/iflow/i.test(e)) roots.push(path.join(g, e));
      }
    } catch { /* ignore */ }
  }
  for (const cand of [home(".iflow"), home(".config", "iflow")]) {
    try { if (fs.existsSync(cand)) roots.push(cand); } catch { /* ignore */ }
  }
  for (const root of roots) {
    for await (const file of walkFiles(root, { maxDepth: 5, exts: new Set([".js", ".mjs", ".cjs", ".json"]) })) {
      let text;
      try { text = await fsp.readFile(file, "utf8"); } catch { continue; }
      if (!/iflow\.cn/i.test(text)) continue;
      const id = text.match(/clientId["']?\s*:\s*["'](\d{8,14})["']/);
      const secret = text.match(/clientSecret["']?\s*:\s*["']([A-Za-z0-9]{28,40})["']/);
      if (id && secret) return { clientId: id[1], clientSecret: secret[1] };
    }
  }
  return null;
}

const DETECTORS = {
  gemini: detectGeminiCli,
  antigravity: detectAntigravity,
  iflow: detectIflow,
  windsurf: detectWindsurf,
};

// ---------------------------------------------------------------------------
// Cache IO + backend registration
// ---------------------------------------------------------------------------

async function writeCacheEntry(provider, creds) {
  await fsp.mkdir(CACHE_DIR, { recursive: true });
  let data = {};
  try { data = JSON.parse(await fsp.readFile(CACHE_FILE, "utf8")); } catch { /* fresh */ }
  data[provider] = { ...creds, detectedAt: new Date().toISOString() };
  const tmp = `${CACHE_FILE}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2));
  await fsp.rename(tmp, CACHE_FILE);
  __setCacheData(data); // refresh core's mirror
}

let inflight = null;

__setBackend({
  async ensureDetected(providers = PROVIDERS) {
    if (inflight) return inflight;
    inflight = (async () => {
      const results = {};
      for (const p of providers) {
        if (!DETECTORS[p]) continue;
        if (getCreds(p)) { results[p] = "already-resolved"; continue; }
        try {
          const creds = await DETECTORS[p]();
          if (creds && creds.clientId && creds.clientSecret) {
            const clean = { clientId: creds.clientId, clientSecret: creds.clientSecret };
            await writeCacheEntry(p, { ...clean, source: "detected" });
            results[p] = "detected";
          } else if (creds?._incomplete) {
            results[p] = "partial (needs manual setup)";
          } else {
            results[p] = "not-found";
          }
        } catch (err) {
          results[p] = `error: ${err?.message || err}`;
        }
      }
      return results;
    })();
    try {
      return await inflight;
    } finally {
      inflight = null;
    }
  },
});

// Initial load: mirror the existing cache file into the core's memory so
// synchronous getCreds() calls work immediately after this module imports.
try {
  __setCacheData(JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")));
} catch {
  __setCacheData({});
}

// Convenience passthroughs (backend is registered by the time these run).
export { ensureDetected, credStatus } from "./providerCreds.js";
