import fs from "node:fs";
import path from "path";
import os from "os";

const APP_NAME = "kosh";
const SUB_DIR = "gateway";

function defaultDir() {
  const base = process.platform === "win32"
    ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), APP_NAME, SUB_DIR)
    : path.join(os.homedir(), `.${APP_NAME}`, SUB_DIR);

  // Auto-migrate legacy 9router data if present and target doesn't exist
  try {
    if (!fs.existsSync(base)) {
      const legacyDir = process.platform === "win32"
        ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "9router")
        : path.join(os.homedir(), ".9router");

      if (fs.existsSync(legacyDir)) {
        fs.mkdirSync(base, { recursive: true });
        // Copy database and settings
        const legacyDb = path.join(legacyDir, "db");
        if (fs.existsSync(legacyDb)) {
          const targetDb = path.join(base, "db");
          fs.mkdirSync(targetDb, { recursive: true });
          const files = fs.readdirSync(legacyDb);
          for (const file of files) {
            const src = path.join(legacyDb, file);
            const dst = path.join(targetDb, file);
            if (fs.statSync(src).isFile()) {
              fs.copyFileSync(src, dst);
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("[DATA_DIR] Migration check note:", e.message);
  }

  return base;
}

export function getDataDir() {
  const configured = process.env.DATA_DIR;
  if (!configured) return defaultDir();

  // On Windows, ignore Unix-style absolute paths from Docker/Linux configs
  if (process.platform === "win32" && /^\//.test(configured)) {
    console.warn(`[DATA_DIR] '${configured}' is a Unix path on Windows → fallback to default`);
    return defaultDir();
  }

  try {
    fs.mkdirSync(configured, { recursive: true });
    return configured;
  } catch (e) {
    if (e?.code === "EACCES" || e?.code === "EPERM") {
      console.warn(`[DATA_DIR] '${configured}' not writable → fallback to default`);
      return defaultDir();
    }
    throw e;
  }
}

export const DATA_DIR = getDataDir();
