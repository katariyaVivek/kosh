// Re-export: implementation shared with tailscale (see ../shared/healthCheck.js).
import { HEALTH_CHECK } from "./config.js";
import { createHealthChecker } from "../shared/healthCheck.js";

export const { probeUrlAlive, waitForHealth } = createHealthChecker(HEALTH_CHECK);
