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
              <AreaChart data={data}>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <YAxis hide />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const pt = payload[0].payload
                    return (
                      <div className="rounded border border-border bg-card p-2 text-sm">
                        <p className="font-medium">{label}</p>
                        <p>{`Cost: $${pt.cost.toFixed(2)}`}</p>
                        <p>{`Calls: ${pt.calls}`}</p>
                      </div>
                    )
                  }}
                  cursor={false}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.15}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
