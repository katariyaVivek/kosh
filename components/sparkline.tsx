"use client"

import { useMemo } from "react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"

type SparklineProps = {
  data: number[]
  color?: string
  height?: number
  width?: number
}

export function Sparkline({
  data,
  color = "hsl(var(--chart-1))",
  height = 28,
  width = 64,
}: SparklineProps) {
  const chartData = useMemo(
    () =>
      data.map((value, i) => ({
        index: i,
        value,
      })),
    [data]
  )

  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={`sparkline-${color.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#sparkline-${color.replace(/[^a-zA-Z0-9]/g, "")})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
