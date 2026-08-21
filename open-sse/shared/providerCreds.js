/**
 * Provider OAuth credential resolver — portable core.
 *
 * Kosh ships with zero embedded provider credentials. Credentials resolve in
 * this order:
 *
 *   1. Environment variables (headless/Docker override)
 *   2. Local cache (data/provider-creds.json, gitignored) mirrored into memory
 *      by the Node backend (providerCredsNode.js)
 *   3. Auto-detection: pattern-scan of the provider's own installed app/CLI on
 *      this machine (run by the Node backend)
 *
 * This module intentionally has ZERO Node built-in imports so it is safe to
 * pull into client bundles (registry configs are reachable from browser code).
 * All filesystem/network work lives in providerCredsNode.js, which registers
 * itself as the backend at startup (see src/instrumentation.js).
 */

export const PROVIDERS = ["gemini", "antigravity", "iflow", "windsurf"];

export const ENV_KEYS = {
  gemini: ["GEMINI_OAUTH_CLIENT_ID", "GEMINI_OAUTH_CLIENT_SECRET"],
  antigravity: ["ANTIGRAVITY_OAUTH_CLIENT_ID", "ANTIGRAVITY_OAUTH_CLIENT_SECRET"],
  iflow: ["IFLOW_OAUTH_CLIENT_ID", "IFLOW_OAUTH_CLIENT_SECRET"],
  windsurf: ["WINDSURF_OAUTH_CLIENT_ID", "WINDSURF_FIREBASE_API_KEY"],
};

let backend = null;
let cacheData = {};

/** @private — used by providerCredsNode.js to register the Node backend. */
export function __setBackend(api) {
  backend = api;
}

/** @private — used by providerCredsNode.js to mirror the cache file into memory. */
export function __setCacheData(data) {
  cacheData = data && typeof data === "object" ? data : {};
}

function envCreds(provider) {
  const keys = ENV_KEYS[provider];
  if (!keys) return null;
  let clientId = "";
  let clientSecret = "";
  try {
    clientId = process.env?.[keys[0]] || "";
    clientSecret = process.env?.[keys[1]] || "";
  } catch {
    return null;
  }
  // A complete pair overrides; a partial one would break auth, so ignore it.
  if (clientId && clientSecret) return { clientId, clientSecret, source: "env" };
  return null;
}

/**
 * Resolve credentials for a provider. Synchronous; never triggers scans.
 * @returns {{clientId:string, clientSecret:string, source:string}|null}
 */
export function getCreds(provider) {
  const fromEnv = envCreds(provider);
  if (fromEnv) return fromEnv;
  const hit = cacheData[provider];
  if (hit && hit.clientId && hit.clientSecret) {
    return { clientId: hit.clientId, clientSecret: hit.clientSecret, source: hit.source || "cache" };
  }
  return null;
}

/** Non-secret status snapshot for diagnostics / settings UI. */
export function credStatus() {
  return Object.fromEntries(
    PROVIDERS.map((p) => {
      const hit = cacheData[p];
      return [p, {
        env: Boolean(envCreds(p)),
        resolved: Boolean(getCreds(p)),
        source: hit?.source || null,
        detectedAt: hit?.detectedAt || null,
      }];
    })
  );
}

/**
 * Detect and cache credentials for providers without configured values.
 * Delegates to the Node backend when available; concurrent calls share one run.
 * Never throws.
 */
export async function ensureDetected(providers = PROVIDERS) {
  if (!backend || typeof backend.ensureDetected !== "function") {
    return Object.fromEntries((providers || []).map((p) => [p, "resolver-backend-unavailable"]));
  }
  return backend.ensureDetected(providers);
}
