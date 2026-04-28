"use client"

import { useEffect, useState, useMemo } from "react"
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { EmptyStateIllustration } from "@/components/empty-state-illustration"
import { cn } from "@/lib/utils"

interface ChartPoint {
  date: string
  cost: number
  calls: number
}

export function DashboardChart() {
  const [data, setData] = useState<ChartPoint[]>([])
  const [metric, setMetric] = useState<"cost" | "calls">("cost")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard/chart", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load chart data")
        const json: ChartPoint[] = await res.json()
        if (isMounted) setData(json)
      } catch (error) {
        console.error(error)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchData()
    window.addEventListener("kosh:usage-refreshed", fetchData)

    return () => {
      isMounted = false
      window.removeEventListener("kosh:usage-refreshed", fetchData)
    }
  }, [])

  const hasUsage = useMemo(
    () => data.some((pt) => pt.cost > 0 || pt.calls > 0),
    [data]
  )

  const showEmpty = !isLoading && !hasUsage

  const toggleOptions = [
    { value: "cost", label: "Cost" },
    { value: "calls", label: "Calls" },
  ] as const

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border/80 bg-card/82 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border/70 bg-[linear-gradient(180deg,hsl(188_95%_43%_/_0.07),transparent)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Spend telemetry</p>
          <p className="mt-1 text-xs text-muted-foreground">Last 30 days</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-lg border border-border bg-background/80 p-1">
            {toggleOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMetric(opt.value)}
                aria-pressed={metric === opt.value}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  metric === opt.value
                    ? "bg-foreground text-card shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-5">
        {isLoading && <div className="h-56 animate-pulse rounded-lg bg-muted" />}
        {!isLoading && showEmpty && (
          <div className="flex h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-background/45">
            <EmptyStateIllustration variant="no-usage" className="mb-2" />
            <p className="text-sm text-muted-foreground">No usage data in the last 30 days</p>
          </div>
        )}
        {!isLoading && !showEmpty && (
          <div className="h-[220px] outline-none [&_svg]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  interval={3}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickMargin={10}
                />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    boxShadow: "0 18px 60px rgb(0 0 0 / 0.16)",
                    fontSize: "0.875rem",
                    color: "var(--popover-foreground)",
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: "0.25rem" }}
                  formatter={(value, name) => {
                    const n = name as string
                    return [
                      typeof value === "number"
                        ? metric === "cost"
                          ? `$${value.toFixed(2)}`
                          : value.toLocaleString()
                        : value,
                      n === "cost" ? "Cost" : n === "calls" ? "Calls" : n,
                    ]
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#colorGradient)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    strokeWidth: 0,
                    fill: "var(--primary)",
                    filter: "drop-shadow(0 0 4px var(--primary))",
                  }}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
