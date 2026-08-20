import fs from "node:fs";
import path from "path";
import os from "os";

const APP_NAME = "kosh";
const SUB_DIR = "gateway";

function defaultDir() {
  // 1. Primary: Project local ./data/gateway directory
  const projectDir = path.join(process.cwd(), "data", SUB_DIR);

  // 2. Auto-migrate existing AppData/Roaming database if present and target doesn't exist
  try {
    const projectDb = path.join(projectDir, "db", "data.sqlite");
    if (!fs.existsSync(projectDb)) {
      const appDataDir = process.platform === "win32"
        ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), APP_NAME, SUB_DIR)
        : path.join(os.homedir(), `.${APP_NAME}`, SUB_DIR);

      const legacy9routerDir = process.platform === "win32"
        ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "9router")
        : path.join(os.homedir(), ".9router");

      const sourceDir = fs.existsSync(path.join(appDataDir, "db", "data.sqlite"))
        ? appDataDir
        : fs.existsSync(path.join(legacy9routerDir, "db", "data.sqlite"))
          ? legacy9routerDir
          : null;

      if (sourceDir) {
        fs.mkdirSync(path.join(projectDir, "db"), { recursive: true });
        const sourceDbDir = path.join(sourceDir, "db");
        if (fs.existsSync(sourceDbDir)) {
          const files = fs.readdirSync(sourceDbDir);
          for (const file of files) {
            const src = path.join(sourceDbDir, file);
            const dst = path.join(projectDir, "db", file);
            if (fs.statSync(src).isFile()) {
              fs.copyFileSync(src, dst);
            }
          }
          console.log(`[DATA_DIR] Migrated existing Gateway database from ${sourceDir} -> ${projectDir}`);
        }
      }
    }
  } catch (e) {
    console.warn("[DATA_DIR] Migration check note:", e.message);
  }

  try {
    fs.mkdirSync(projectDir, { recursive: true });
    return projectDir;
  } catch {
    // Fallback if project dir is unwritable
    const fallback = process.platform === "win32"
      ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), APP_NAME, SUB_DIR)
      : path.join(os.homedir(), `.${APP_NAME}`, SUB_DIR);
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
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
