-- CreateTable
CREATE TABLE "UsageQuotaSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usageSourceId" TEXT NOT NULL,
    "provider" TEXT,
    "sourceLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "accountEmail" TEXT,
    "accountPlan" TEXT,
    "primaryUsedPercent" REAL,
    "primaryWindowMinutes" INTEGER,
    "primaryResetsAt" DATETIME,
    "primaryResetDescription" TEXT,
    "secondaryUsedPercent" REAL,
    "secondaryWindowMinutes" INTEGER,
    "secondaryResetsAt" DATETIME,
    "secondaryResetDescription" TEXT,
    "creditsRemaining" REAL,
    "hasCredits" BOOLEAN,
    "unlimited" BOOLEAN,
    "error" TEXT,
    "metadataJson" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UsageQuotaSnapshot_usageSourceId_fkey" FOREIGN KEY ("usageSourceId") REFERENCES "UsageSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UsageQuotaSnapshot_usageSourceId_fetchedAt_idx" ON "UsageQuotaSnapshot"("usageSourceId", "fetchedAt");

-- CreateIndex
CREATE INDEX "UsageQuotaSnapshot_provider_idx" ON "UsageQuotaSnapshot"("provider");
