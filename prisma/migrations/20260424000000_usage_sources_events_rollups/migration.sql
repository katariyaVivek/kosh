-- CreateTable
CREATE TABLE "UsageSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiKeyId" TEXT,
    "name" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "provider" TEXT,
    "collectionMethod" TEXT NOT NULL,
    "accuracy" TEXT NOT NULL,
    "requiresAdminKey" BOOLEAN NOT NULL DEFAULT false,
    "privacyNote" TEXT,
    "cursor" TEXT,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UsageSource_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usageSourceId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "externalId" TEXT,
    "sourceType" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "calls" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "cost" REAL NOT NULL DEFAULT 0,
    "accuracy" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageEvent_usageSourceId_fkey" FOREIGN KEY ("usageSourceId") REFERENCES "UsageSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UsageEvent_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UsageDailyRollup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usageSourceId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "provider" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "calls" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "cost" REAL NOT NULL DEFAULT 0,
    "accuracy" TEXT NOT NULL,
    "rollupDate" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UsageDailyRollup_usageSourceId_fkey" FOREIGN KEY ("usageSourceId") REFERENCES "UsageSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UsageDailyRollup_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UsageSource_apiKeyId_idx" ON "UsageSource"("apiKeyId");

-- CreateIndex
CREATE INDEX "UsageSource_sourceType_provider_idx" ON "UsageSource"("sourceType", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "UsageEvent_usageSourceId_externalId_key" ON "UsageEvent"("usageSourceId", "externalId");

-- CreateIndex
CREATE INDEX "UsageEvent_apiKeyId_periodStart_idx" ON "UsageEvent"("apiKeyId", "periodStart");

-- CreateIndex
CREATE INDEX "UsageEvent_sourceType_provider_idx" ON "UsageEvent"("sourceType", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "UsageDailyRollup_usageSourceId_rollupDate_key" ON "UsageDailyRollup"("usageSourceId", "rollupDate");

-- CreateIndex
CREATE INDEX "UsageDailyRollup_apiKeyId_rollupDate_idx" ON "UsageDailyRollup"("apiKeyId", "rollupDate");

-- CreateIndex
CREATE INDEX "UsageDailyRollup_provider_idx" ON "UsageDailyRollup"("provider");

-- Backfill existing daily usage logs into the new source/event/rollup model.
INSERT INTO "UsageSource" (
    "id",
    "apiKeyId",
    "name",
    "sourceType",
    "provider",
    "collectionMethod",
    "accuracy",
    "requiresAdminKey",
    "privacyNote",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy_' || "ApiKey"."id",
    "ApiKey"."id",
    "ApiKey"."platform" || ' legacy usage',
    'legacy_usage_log',
    "ApiKey"."platform",
    'manual',
    'manual',
    false,
    'Backfilled from Kosh usage logs created before usage sources were introduced.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ApiKey"
WHERE EXISTS (
    SELECT 1 FROM "UsageLog" WHERE "UsageLog"."apiKeyId" = "ApiKey"."id"
);

INSERT INTO "UsageEvent" (
    "id",
    "usageSourceId",
    "apiKeyId",
    "externalId",
    "sourceType",
    "provider",
    "currency",
    "calls",
    "totalTokens",
    "cost",
    "accuracy",
    "periodStart",
    "periodEnd",
    "capturedAt",
    "createdAt"
)
SELECT
    'legacy_event_' || "UsageLog"."id",
    'legacy_' || "UsageLog"."apiKeyId",
    "UsageLog"."apiKeyId",
    'legacy:' || "UsageLog"."id",
    'legacy_usage_log',
    "ApiKey"."platform",
    'USD',
    "UsageLog"."calls",
    "UsageLog"."tokens",
    "UsageLog"."cost",
    'manual',
    date("UsageLog"."date"),
    datetime(date("UsageLog"."date"), '+1 day'),
    "UsageLog"."date",
    CURRENT_TIMESTAMP
FROM "UsageLog"
JOIN "ApiKey" ON "ApiKey"."id" = "UsageLog"."apiKeyId";

INSERT INTO "UsageDailyRollup" (
    "id",
    "usageSourceId",
    "apiKeyId",
    "provider",
    "currency",
    "calls",
    "totalTokens",
    "cost",
    "accuracy",
    "rollupDate",
    "updatedAt"
)
SELECT
    'legacy_rollup_' || "UsageLog"."apiKeyId" || '_' || date("UsageLog"."date"),
    'legacy_' || "UsageLog"."apiKeyId",
    "UsageLog"."apiKeyId",
    "ApiKey"."platform",
    'USD',
    SUM("UsageLog"."calls"),
    SUM("UsageLog"."tokens"),
    SUM("UsageLog"."cost"),
    'manual',
    date("UsageLog"."date"),
    CURRENT_TIMESTAMP
FROM "UsageLog"
JOIN "ApiKey" ON "ApiKey"."id" = "UsageLog"."apiKeyId"
GROUP BY "UsageLog"."apiKeyId", date("UsageLog"."date");
