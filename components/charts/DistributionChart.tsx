"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import type { ColumnProfile } from "@/types/dataset";
import { formatCompact, formatNumber, formatPercentRaw } from "@/lib/utils";
import { ChartTooltipContent } from "./ChartTooltip";
import { ChartCard } from "./ChartCard";

interface DistributionChartProps {
  column: ColumnProfile;
}

export function DistributionChart({ column }: DistributionChartProps) {
  const numeric = column.numeric;
  if (!numeric || !numeric.histogram || numeric.histogram.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No histogram data available.
      </div>
    );
  }

  const { histogram, lowerBound, upperBound } = (() => {
    const lb = numeric.mean - 3 * numeric.std;
    const ub = numeric.mean + 3 * numeric.std;
    return { histogram: numeric.histogram, lowerBound: lb, upperBound: ub };
  })();

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={histogram}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        barSize={undefined}
        barCategoryGap="8%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          strokeOpacity={0.4}
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatCompact}
          width={40}
        />
        <Tooltip
          content={
            <ChartTooltipContent
              valueFormatter={(v) => `${formatNumber(v, 0)} rows`}
            />
          }
          cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.5 }}
        />
        <ReferenceLine
          x={undefined}
          stroke="hsl(var(--chart-3))"
          strokeDasharray="3 3"
          strokeOpacity={0.7}
          label={{
            value: `μ ${formatCompact(numeric.mean)}`,
            fontSize: 10,
            fill: "hsl(var(--muted-foreground))",
            position: "insideTopRight",
          }}
        />
        <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
          {histogram.map((bin, index) => {
            const isOutlier = bin.start < lowerBound || bin.end > upperBound;
            return (
              <Cell
                key={`cell-${index}`}
                fill={isOutlier ? "hsl(var(--chart-5))" : "hsl(var(--chart-1))"}
                fillOpacity={isOutlier ? 0.6 : 0.85}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function buildDistributionInsight(column: ColumnProfile) {
  const n = column.numeric;
  if (!n) {
    return {
      what: `${column.name} has no numeric data available.`,
      why: "Cannot derive distribution insights.",
      action: "Check the column type and data quality.",
    };
  }

  const skewDesc =
    n.mean > n.median
      ? "right-skewed (mean > median)"
      : n.mean < n.median
      ? "left-skewed (mean < median)"
      : "approximately symmetric";

  const outlierPresent = column.missing > 0 || n.min < n.mean - 3 * n.std || n.max > n.mean + 3 * n.std;

  const what = `${column.name} ranges from ${formatCompact(n.min)} to ${formatCompact(n.max)}, with a mean of ${formatCompact(n.mean)} and median of ${formatCompact(n.median)} (std: ${formatCompact(n.std)}). The distribution is ${skewDesc}.`;

  const why = outlierPresent
    ? `The presence of extreme values (beyond ±3σ from mean) in ${column.name} can skew averages and mislead reporting — ${column.missing > 0 ? `${column.missing} missing values also affect completeness.` : "review for data entry errors."}`
    : `${column.name} shows a relatively clean distribution — averages are reliable and the data appears consistent.`;

  const action = outlierPresent
    ? `Investigate values outside the range [${formatCompact(n.mean - 3 * n.std)}, ${formatCompact(n.mean + 3 * n.std)}] in ${column.name} to confirm they are valid data points, not errors.`
    : `Use ${column.name}'s mean (${formatCompact(n.mean)}) and median (${formatCompact(n.median)}) with confidence in reports — the distribution is well-behaved. Consider ${formatPercentRaw((n.zeros / column.count) * 100)} zero-rate if relevant.`;

  return { what, why, action };
}

interface DistributionChartCardProps {
  column: ColumnProfile;
}

export function DistributionChartCard({ column }: DistributionChartCardProps) {
  const insight = buildDistributionInsight(column);
  return (
    <ChartCard
      title={`Distribution: ${column.name}`}
      description={column.numeric ? `${column.count.toLocaleString()} values · mean ${formatCompact(column.numeric.mean)}` : undefined}
      insight={insight}
    >
      <DistributionChart column={column} />
    </ChartCard>
  );
}
