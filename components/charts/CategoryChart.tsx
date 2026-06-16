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
  Cell,
} from "recharts";
import type { CategoryBreakdown } from "@/types/dataset";
import { formatCompact, formatPercentRaw } from "@/lib/utils";
import { ChartTooltipContent } from "./ChartTooltip";
import { ChartCard } from "./ChartCard";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface CategoryChartProps {
  breakdown: CategoryBreakdown;
  /** Max items to show (default 8) */
  maxItems?: number;
}

export function CategoryChart({ breakdown, maxItems = 8 }: CategoryChartProps) {
  const items = [...breakdown.items]
    .sort((a, b) => b.value - a.value)
    .slice(0, maxItems);

  return (
    <ResponsiveContainer width="100%" height={Math.max(240, items.length * 36)}>
      <BarChart
        data={items}
        layout="vertical"
        margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        barSize={18}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          strokeOpacity={0.4}
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatCompact}
        />
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          width={100}
          tickFormatter={(v: string) => (v.length > 14 ? v.slice(0, 13) + "…" : v)}
        />
        <Tooltip
          content={
            <ChartTooltipContent
              valueFormatter={(v) => formatCompact(v)}
            />
          }
          cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.4 }}
        />
        <Bar
          dataKey="value"
          name={breakdown.metric ?? breakdown.dimension}
          radius={[0, 6, 6, 0]}
        >
          {items.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
              fillOpacity={1 - index * 0.08}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function buildCategoryInsight(breakdown: CategoryBreakdown) {
  const sorted = [...breakdown.items].sort((a, b) => b.value - a.value);
  const top = sorted[0];
  const topShare = top ? formatPercentRaw(top.pct) : "—";
  const topName = top?.category ?? "—";
  const topCount = sorted.length;
  const top3Share = sorted
    .slice(0, 3)
    .reduce((sum, item) => sum + item.pct, 0);

  const what = `"${topName}" leads the ${breakdown.dimension} breakdown at ${topShare} of total ${breakdown.metric ?? "value"} (${formatCompact(breakdown.total)}). The top 3 categories account for ${formatPercentRaw(top3Share)} combined.`;

  const why =
    top3Share > 80
      ? `High concentration (${formatPercentRaw(top3Share)} in top 3) suggests dependency risk — losing one segment could disproportionately impact your mission outcomes.`
      : `With ${topCount} active categories and the top 3 holding ${formatPercentRaw(top3Share)}, there is reasonable diversification — but the leading segment still warrants attention.`;

  const action =
    top3Share > 80
      ? `Explore strategies to diversify ${breakdown.dimension} — reducing dependency on "${topName}" will improve resilience and reduce concentration risk.`
      : `Leverage "${topName}" as a model for other segments. Review the lowest-performing categories for potential consolidation or investment opportunities.`;

  return { what, why, action };
}

interface CategoryChartCardProps {
  breakdown: CategoryBreakdown;
}

export function CategoryChartCard({ breakdown }: CategoryChartCardProps) {
  const insight = buildCategoryInsight(breakdown);
  return (
    <ChartCard
      title={breakdown.metric ? `${breakdown.metric} by ${breakdown.dimension}` : breakdown.dimension}
      description={`${breakdown.items.length} categories · total ${formatCompact(breakdown.total)}`}
      insight={insight}
    >
      <CategoryChart breakdown={breakdown} />
    </ChartCard>
  );
}
