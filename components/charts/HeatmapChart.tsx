"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChartCard } from "./ChartCard";
import { pearson, toNumber } from "@/lib/analytics/stats";
import type { DataRow } from "@/types/dataset";

export interface CorrelationData {
  labels: string[];
  matrix: number[][];
}

/** Compute Pearson correlation matrix from raw dataset rows + column names. */
export function computeCorrelation(
  rows: DataRow[],
  numericColumns: string[]
): CorrelationData {
  const labels = numericColumns;
  const vectors: number[][] = labels.map((col) => {
    const vals: number[] = [];
    for (const row of rows) {
      const v = toNumber(row[col] ?? null);
      if (v !== null) vals.push(v);
      else vals.push(NaN);
    }
    return vals;
  });

  const n = labels.length;
  const matrix: number[][] = Array.from({ length: n }, () =>
    new Array(n).fill(0)
  );

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
        continue;
      }
      const xs: number[] = [];
      const ys: number[] = [];
      const vi = vectors[i];
      const vj = vectors[j];
      for (let k = 0; k < rows.length; k++) {
        const x = vi[k];
        const y = vj[k];
        if (!isNaN(x) && !isNaN(y)) {
          xs.push(x);
          ys.push(y);
        }
      }
      matrix[i][j] = pearson(xs, ys);
    }
  }

  return { labels, matrix };
}

/** Map correlation value -1..1 to a CSS color string. */
function corrToColor(value: number): string {
  if (isNaN(value)) return "hsl(var(--muted))";
  if (value >= 0) {
    // positive: white → chart-1 (emerald)
    const opacity = Math.min(1, Math.abs(value));
    return `hsl(var(--chart-1) / ${opacity.toFixed(2)})`;
  } else {
    // negative: white → chart-5 (rose/red-ish)
    const opacity = Math.min(1, Math.abs(value));
    return `hsl(var(--chart-5) / ${opacity.toFixed(2)})`;
  }
}

function corrToTextColor(value: number): string {
  if (isNaN(value)) return "hsl(var(--muted-foreground))";
  return Math.abs(value) > 0.5
    ? "hsl(var(--card))"
    : "hsl(var(--foreground))";
}

interface HeatmapChartProps {
  correlation: CorrelationData;
  className?: string;
}

export function HeatmapChart({ correlation, className }: HeatmapChartProps) {
  const { labels, matrix } = correlation;
  const n = labels.length;

  if (n === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        No numeric columns available for correlation.
      </div>
    );
  }

  const cellSize = Math.max(32, Math.min(56, Math.floor(480 / n)));

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="inline-block min-w-max">
        {/* Column headers */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${cellSize}px repeat(${n}, ${cellSize}px)`,
          }}
        >
          {/* Top-left empty */}
          <div />
          {labels.map((label) => (
            <div
              key={label}
              className="flex items-end justify-center pb-1 text-center"
              style={{ height: cellSize + 8 }}
            >
              <span
                className="block truncate text-[10px] text-muted-foreground"
                style={{
                  maxWidth: cellSize - 2,
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Rows */}
        {matrix.map((row, i) => (
          <div
            key={labels[i]}
            className="grid items-center"
            style={{
              gridTemplateColumns: `${cellSize}px repeat(${n}, ${cellSize}px)`,
            }}
          >
            {/* Row label */}
            <div
              className="flex items-center justify-end pr-1.5"
              style={{ height: cellSize }}
            >
              <span className="truncate text-[10px] text-muted-foreground" style={{ maxWidth: cellSize - 4 }}>
                {labels[i]}
              </span>
            </div>
            {/* Cells */}
            {row.map((val, j) => (
              <div
                key={`${i}-${j}`}
                className="group relative flex items-center justify-center rounded"
                style={{
                  height: cellSize,
                  width: cellSize,
                  backgroundColor: corrToColor(val),
                }}
                title={`${labels[i]} × ${labels[j]}: ${isNaN(val) ? "n/a" : val.toFixed(2)}`}
              >
                <span
                  className="text-[10px] font-medium tabular-nums"
                  style={{ color: corrToTextColor(val) }}
                >
                  {isNaN(val) ? "—" : val.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ))}

        {/* Legend */}
        <div className="mt-3 flex items-center gap-2">
          <div
            className="h-2.5 w-20 rounded"
            style={{
              background:
                "linear-gradient(to right, hsl(var(--chart-5)), hsl(var(--muted)), hsl(var(--chart-1)))",
            }}
          />
          <div className="flex gap-4 text-[10px] text-muted-foreground tabular-nums">
            <span>−1 strong negative</span>
            <span>0 none</span>
            <span>+1 strong positive</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildHeatmapInsight(correlation: CorrelationData) {
  const { labels, matrix } = correlation;
  const n = labels.length;

  let maxCorr = -Infinity;
  let maxI = 0;
  let maxJ = 1;
  let minCorr = Infinity;
  let minI = 0;
  let minJ = 1;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const v = matrix[i][j];
      if (!isNaN(v)) {
        if (v > maxCorr) { maxCorr = v; maxI = i; maxJ = j; }
        if (v < minCorr) { minCorr = v; minI = i; minJ = j; }
      }
    }
  }

  const hasData = n >= 2 && maxCorr > -Infinity;

  const what = hasData
    ? `Across ${n} numeric columns, the strongest positive correlation is between "${labels[maxI]}" and "${labels[maxJ]}" (r = ${maxCorr.toFixed(2)}), and the strongest negative is between "${labels[minI]}" and "${labels[minJ]}" (r = ${minCorr.toFixed(2)}).`
    : `Correlation matrix computed for ${n} numeric column${n !== 1 ? "s" : ""}.`;

  const why = hasData
    ? Math.abs(maxCorr) > 0.7
      ? `A correlation of ${maxCorr.toFixed(2)} between "${labels[maxI]}" and "${labels[maxJ]}" suggests these metrics move together — they may share a common driver or causal relationship worth exploring.`
      : `No extremely strong correlations were found, suggesting the numeric metrics in this dataset are relatively independent.`
    : "With fewer than 2 numeric columns, no pairwise correlations can be computed.";

  const action = hasData
    ? Math.abs(maxCorr) > 0.7
      ? `Investigate the relationship between "${labels[maxI]}" and "${labels[maxJ]}" — if it reflects a real-world dependency, you may be able to predict one from the other.`
      : `No action required for correlations — continue monitoring these metrics independently.`
    : "Add more numeric columns to enable correlation analysis.";

  return { what, why, action };
}

interface HeatmapChartCardProps {
  correlation: CorrelationData;
}

export function HeatmapChartCard({ correlation }: HeatmapChartCardProps) {
  const insight = buildHeatmapInsight(correlation);
  return (
    <ChartCard
      title="Correlation Matrix"
      description={`${correlation.labels.length} numeric columns · Pearson r`}
      insight={insight}
    >
      <HeatmapChart correlation={correlation} />
    </ChartCard>
  );
}
