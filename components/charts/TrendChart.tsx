"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Legend,
} from "recharts";
import type { TrendAnalysis } from "@/types/dataset";
import { formatCompact, formatPercentRaw } from "@/lib/utils";
import { ChartTooltipContent } from "./ChartTooltip";
import { ChartCard } from "./ChartCard";

interface TrendChartProps {
  trend: TrendAnalysis;
}

export function TrendChart({ trend }: TrendChartProps) {
  const hasPeak = trend.peak && trend.series.length > 0;
  const hasTrough = trend.trough && trend.series.length > 0;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={trend.series}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          strokeOpacity={0.4}
          vertical={false}
        />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatCompact}
          width={48}
        />
        <Tooltip
          content={
            <ChartTooltipContent
              valueFormatter={(v) => formatCompact(v)}
            />
          }
          cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
        />
        {trend.series.some((p) => p.rollingAvg !== undefined) && (
          <Legend
            wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}
            iconType="line"
            iconSize={12}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          name={trend.metric}
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "hsl(var(--chart-1))", strokeWidth: 0 }}
        />
        {trend.series.some((p) => p.rollingAvg !== undefined) && (
          <Line
            type="monotone"
            dataKey="rollingAvg"
            name="Rolling avg"
            stroke="hsl(var(--chart-2))"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 3, fill: "hsl(var(--chart-2))", strokeWidth: 0 }}
          />
        )}
        {hasPeak && (
          <ReferenceDot
            x={trend.peak.period}
            y={trend.peak.value}
            r={4}
            fill="hsl(var(--chart-1))"
            stroke="hsl(var(--background))"
            strokeWidth={2}
            label={{
              value: "Peak",
              position: "top",
              fontSize: 10,
              fill: "hsl(var(--muted-foreground))",
            }}
          />
        )}
        {hasTrough && (
          <ReferenceDot
            x={trend.trough.period}
            y={trend.trough.value}
            r={4}
            fill="hsl(var(--chart-3))"
            stroke="hsl(var(--background))"
            strokeWidth={2}
            label={{
              value: "Low",
              position: "bottom",
              fontSize: 10,
              fill: "hsl(var(--muted-foreground))",
            }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

function buildTrendInsight(trend: TrendAnalysis) {
  const growthStr =
    trend.totalGrowthPct >= 0
      ? `+${formatPercentRaw(trend.totalGrowthPct)}`
      : formatPercentRaw(trend.totalGrowthPct);
  const dirLabel =
    trend.direction === "up"
      ? "increasing"
      : trend.direction === "down"
      ? "decreasing"
      : "flat";
  const periodCount = trend.series.length;

  const what = `${trend.metric} is ${dirLabel} with ${growthStr} total growth over ${periodCount} ${trend.granularity} periods (from ${formatCompact(trend.first)} to ${formatCompact(trend.last)}).`;

  const why =
    trend.direction === "up"
      ? `Growth in ${trend.metric} often reflects program expansion or increased community impact — critical for grant reporting and impact storytelling.`
      : trend.direction === "down"
      ? `A decline in ${trend.metric} may signal reduced capacity or demand — early detection allows timely intervention before it worsens.`
      : `Stable ${trend.metric} may indicate consistent service delivery, but also a lack of growth — worth understanding whether this is intentional.`;

  const action =
    trend.direction === "up"
      ? `Document this ${growthStr} growth and peak of ${formatCompact(trend.peak.value)} (${trend.peak.period}) in your impact reports and grant applications.`
      : trend.direction === "down"
      ? `Investigate the trough of ${formatCompact(trend.trough.value)} in ${trend.trough.period} — identify root causes and plan corrective action.`
      : `Assess whether flat performance in ${trend.metric} reflects saturation or resource constraints and set a target growth rate for the next period.`;

  return { what, why, action };
}

interface TrendChartCardProps {
  trend: TrendAnalysis;
}

export function TrendChartCard({ trend }: TrendChartCardProps) {
  const insight = buildTrendInsight(trend);
  return (
    <ChartCard
      title={trend.metric}
      description={`${trend.granularity} trend · ${trend.series.length} periods`}
      insight={insight}
    >
      <TrendChart trend={trend} />
    </ChartCard>
  );
}
