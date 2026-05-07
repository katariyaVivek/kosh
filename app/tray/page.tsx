import { formatDistanceToNow } from "date-fns";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function toRemainingPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  if (value <= 1) return Math.max(0, Math.min(100, value * 100));
  return Math.max(0, Math.min(100, 100 - value));
}

export default async function TrayPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextDay = new Date(todayStart);
  nextDay.setDate(nextDay.getDate() + 1);

  const [
    todayUsage,
    monthlyLocal,
    codexQuota,
    localSources,
  ] = await Promise.all([
    db.usageDailyRollup.aggregate({
      _sum: { cost: true, calls: true, totalTokens: true },
      where: { rollupDate: { gte: todayStart, lt: nextDay } },
    }),
    db.usageDailyRollup.aggregate({
      _sum: { cost: true, calls: true, totalTokens: true },
      where: {
        usageSource: { sourceType: "local_tool" },
      },
    }),
    db.usageQuotaSnapshot.findFirst({
      where: { provider: "Codex", usageSource: { sourceType: "quota" } },
      orderBy: { fetchedAt: "desc" },
      select: {
        primaryUsedPercent: true,
        secondaryUsedPercent: true,
        fetchedAt: true,
      },
    }),
    db.usageSource.findMany({
      where: { sourceType: "local_tool" },
      select: { provider: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const sessionRemaining = toRemainingPercent(codexQuota?.primaryUsedPercent);
  const weeklyRemaining = toRemainingPercent(codexQuota?.secondaryUsedPercent);
  const updatedAgo = codexQuota
    ? formatDistanceToNow(codexQuota.fetchedAt, { addSuffix: true })
    : "No quota snapshot";

  return (
    <main className="min-h-screen bg-background px-4 py-4 text-foreground">
      <div className="mx-auto w-full max-w-md space-y-3">
        <section className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs uppercase text-muted-foreground">Kosh Tray</p>
          <h1 className="mt-1 text-lg font-semibold">Quick Usage</h1>
          <p className="mt-1 text-xs text-muted-foreground">Updated {updatedAgo}</p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs uppercase text-muted-foreground">Today Spend</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
              {currencyFormatter.format(todayUsage._sum.cost ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs uppercase text-muted-foreground">Today Calls</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
              {compactNumberFormatter.format(todayUsage._sum.calls ?? 0)}
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs uppercase text-muted-foreground">Codex Quota</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">5h Remaining</p>
              <p className="font-mono text-lg font-semibold tabular-nums">
                {sessionRemaining === null ? "N/A" : `${sessionRemaining.toFixed(0)}%`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Weekly Remaining</p>
              <p className="font-mono text-lg font-semibold tabular-nums">
                {weeklyRemaining === null ? "N/A" : `${weeklyRemaining.toFixed(0)}%`}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs uppercase text-muted-foreground">Local AI Total</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Tokens</p>
              <p className="font-mono font-semibold tabular-nums">
                {compactNumberFormatter.format(monthlyLocal._sum.totalTokens ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Spend</p>
              <p className="font-mono font-semibold tabular-nums">
                {currencyFormatter.format(monthlyLocal._sum.cost ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Calls</p>
              <p className="font-mono font-semibold tabular-nums">
                {compactNumberFormatter.format(monthlyLocal._sum.calls ?? 0)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs uppercase text-muted-foreground">Sources</p>
          <ul className="mt-2 space-y-1">
            {localSources.length === 0 ? (
              <li className="text-sm text-muted-foreground">No local sources yet</li>
            ) : (
              localSources.map((source, index) => (
                <li key={`${source.provider ?? "unknown"}-${index}`} className="flex items-center justify-between text-sm">
                  <span>{source.provider ?? "Unknown"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(source.updatedAt, { addSuffix: true })}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
