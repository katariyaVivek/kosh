PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiKeyId" TEXT,
    "usageSourceId" TEXT,
    "type" TEXT NOT NULL,
    "threshold" REAL NOT NULL,
    "triggered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Alert_usageSourceId_fkey" FOREIGN KEY ("usageSourceId") REFERENCES "UsageSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Alert" ("id", "apiKeyId", "type", "threshold", "triggered", "createdAt")
SELECT "id", "apiKeyId", "type", "threshold", "triggered", "createdAt"
FROM "Alert";

DROP TABLE "Alert";
ALTER TABLE "new_Alert" RENAME TO "Alert";

CREATE INDEX "Alert_apiKeyId_idx" ON "Alert"("apiKeyId");
CREATE INDEX "Alert_usageSourceId_idx" ON "Alert"("usageSourceId");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
