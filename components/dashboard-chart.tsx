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
    return () => {
      isMounted = false
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
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm w-full">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Spend over time</p>
        <div className="flex flex-col items-end space-y-1">
          <p className="text-xs text-muted-foreground">Last 30 days</p>
          <div className="inline-flex items-center rounded-full border border-border bg-muted p-1">
            {toggleOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMetric(opt.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  metric === opt.value
                    ? "bg-foreground text-card"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5">
        {isLoading && <div className="h-48 animate-pulse rounded-xl bg-muted" />}
        {!isLoading && showEmpty && (
          <div className="flex h-[180px] flex-col items-center justify-center space-y-2">
            <EmptyStateIllustration variant="no-usage" className="mb-2" />
            <p className="text-sm text-muted-foreground">No usage data this month</p>
          </div>
        )}
        {!isLoading && !showEmpty && (
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickMargin={10}
                />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--border)",
                    borderRadius: "0.75rem",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
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
                  cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
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
