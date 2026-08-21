/**
 * postinstall for the npm distribution.
 *
 * Generates the Prisma client (fetches the correct query engine for this
 * platform). Deliberately soft-failing: a flaky network during global
 * install must not break it — `kosh bootstrap` retries generation later.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const schema = path.join(pkgRoot, "prisma", "schema.prisma");
  if (!fs.existsSync(schema)) {
    console.warn("[kosh] prisma/schema.prisma missing — skipping generate.");
    process.exit(0);
  }
  console.log("[kosh] Generating Prisma client...");
  const res = spawnSync(process.execPath, [path.join(pkgRoot, "node_modules", "prisma", "build", "index.js"), "generate"], {
    cwd: pkgRoot,
    stdio: "inherit",
    timeout: 180_000,
  });
  if (res.status !== 0) {
    console.warn("[kosh] Prisma generate did not finish; it will retry on first `kosh` run.");
  }
} catch (err) {
  console.warn(`[kosh] Prisma generate skipped (${err?.message || err}); retries on first \`kosh\` run.`);
}
