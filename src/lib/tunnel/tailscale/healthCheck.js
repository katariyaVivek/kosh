// Re-export: implementation shared with cloudflare (see ../shared/healthCheck.js).
import { HEALTH_CHECK } from "./config.js";
import { createHealthChecker } from "../shared/healthCheck.js";

export const { probeUrlAlive, waitForHealth } = createHealthChecker(HEALTH_CHECK);
