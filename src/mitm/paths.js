const fs = require("fs");
const path = require("path");
const os = require("os");

const APP_NAME = "kosh";
const SUB_DIR = "gateway";

function defaultDir() {
  const projectDir = process.env.KOSH_HOME
    ? path.join(process.env.KOSH_HOME, "data", SUB_DIR)
    : path.join(process.cwd(), "data", SUB_DIR);
  try {
    fs.mkdirSync(projectDir, { recursive: true });
    return projectDir;
  } catch {
    const fallback = process.platform === "win32"
      ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), APP_NAME, SUB_DIR)
      : path.join(os.homedir(), `.${APP_NAME}`, SUB_DIR);
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function getDataDir() {
  const configured = process.env.DATA_DIR;
  if (!configured) return defaultDir();
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

const DATA_DIR = getDataDir();
const MITM_DIR = path.join(DATA_DIR, "mitm");

module.exports = { DATA_DIR, MITM_DIR };
