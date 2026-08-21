// Generic tunnel health-check implementation.
// Each tunnel flavor (cloudflare / tailscale) supplies its own HEALTH_CHECK
// timings from its local config.js via createHealthChecker().
import { resolveDns } from "./dnsResolver.js";

export function createHealthChecker(HEALTH_CHECK) {
  async function probeUrlAlive(url) {
    if (!url) return false;
    let hostname;
    try { hostname = new URL(url).hostname; } catch { return false; }

    if (!await resolveDns(hostname, HEALTH_CHECK.dnsTimeoutMs)) return false;

    try {
      const res = await fetch(`${url}/api/health`, {
        signal: AbortSignal.timeout(HEALTH_CHECK.fetchTimeoutMs),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function waitForHealth(url, cancelToken = { cancelled: false }) {
    const start = Date.now();
    while (Date.now() - start < HEALTH_CHECK.timeoutMs) {
      if (cancelToken.cancelled) throw new Error("cancelled");
      if (await probeUrlAlive(url)) return true;
      await new Promise((r) => setTimeout(r, HEALTH_CHECK.intervalMs));
    }
    throw new Error(`Health check timeout after ${HEALTH_CHECK.timeoutMs}ms`);
  }

  return { probeUrlAlive, waitForHealth };
}
