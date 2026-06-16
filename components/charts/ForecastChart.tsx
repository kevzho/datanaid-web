"use client";

import * as React from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ForecastResult, ForecastPoint } from "@/types/dataset";
import { formatCompact, formatPercentRaw } from "@/lib/utils";
import { ChartCard } from "./ChartCard";

interface CombinedPoint {
  period: string;
  historyValue?: number;
  forecastValue?: number;
  lower?: number;
  upper?: number;
  isForecast: boolean;
}

function buildSeriesData(forecast: ForecastResult): CombinedPoint[] {
  const historyPts: CombinedPoint[] = forecast.history.map((p: ForecastPoint) => ({
    period: p.period,
    historyValue: p.value,
    isForecast: false,
  }));

  const forecastPts: CombinedPoint[] = forecast.forecast.map((p: ForecastPoint) => ({
    period: p.period,
    forecastValue: p.value,
    lower: p.lower,
    upper: p.upper,
    isForecast: true,
  }));

  return [...historyPts, ...forecastPts];
}

// Custom tooltip for forecast with confidence interval
function ForecastTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const isForecast = payload.some((p) => p.name === "Forecast");
  const value =
    payload.find((p) => p.name === "History")?.value ??
    payload.find((p) => p.name === "Forecast")?.value;
  const lower = payload.find((p) => p.name === "lower")?.value;
  const upper = payload.find((p) => p.name === "upper")?.value;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      {value !== undefined && (
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: "hsl(var(--chart-1))" }}
          />
          <span className="text-xs text-muted-foreground">
            {isForecast ? "Forecast" : "Actual"}
          </span>
          <span className="ml-auto pl-4 text-xs font-medium tabular-nums text-popover-foreground">
            {formatCompact(value)}
          </span>
        </div>
      )}
      {isForecast && lower !== undefined && upper !== undefined && (
        <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
          CI: [{formatCompact(lower)}, {formatCompact(upper)}]
        </div>
      )}
    </div>
  );
}

interface ForecastChartProps {
  forecast: ForecastResult;
}

export function ForecastChart({ forecast }: ForecastChartProps) {
  const data = buildSeriesData(forecast);
  const dividerPeriod =
    forecast.history.length > 0
      ? forecast.history[forecast.history.length - 1].period
      : undefined;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.15} />
            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.03} />
          </linearGradient>
        </defs>
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
        <Tooltip content={<ForecastTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />

        {/* Confidence band for forecast */}
        <Area
          type="monotone"
          dataKey="upper"
          name="upper"
          stroke="none"
          fill="url(#forecastBand)"
          fillOpacity={1}
          legendType="none"
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="lower"
          name="lower"
          stroke="none"
          fill="hsl(var(--background))"
          fillOpacity={1}
          legendType="none"
          isAnimationActive={false}
        />

        {/* History line */}
        <Line
          type="monotone"
          dataKey="historyValue"
          name="History"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "hsl(var(--chart-1))", strokeWidth: 0 }}
          connectNulls={false}
        />

        {/* Forecast dashed line */}
        <Line
          type="monotone"
          dataKey="forecastValue"
          name="Forecast"
          stroke="hsl(var(--chart-3))"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          activeDot={{ r: 4, fill: "hsl(var(--chart-3))", strokeWidth: 0 }}
          connectNulls={false}
        />

        {/* History / forecast divider */}
        {dividerPeriod && (
          <ReferenceLine
            x={dividerPeriod}
            stroke="hsl(var(--border))"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            label={{
              value: "Forecast →",
              position: "insideTopRight",
              fontSize: 10,
              fill: "hsl(var(--muted-foreground))",
            }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function buildForecastInsight(forecast: ForecastResult) {
  const lastHistory =
    forecast.history.length > 0
      ? forecast.history[forecast.history.length - 1]
      : null;
  const lastForecast =
    forecast.forecast.length > 0
      ? forecast.forecast[forecast.forecast.length - 1]
      : null;

  const projectedValue = lastForecast?.value;
  const projectedLower = lastForecast?.lower;
  const projectedUpper = lastForecast?.upper;
  const r2Pct = formatPercentRaw(forecast.r2 * 100, 0);
  const historyStart = forecast.history[0]?.period ?? "—";
  const historyEnd = lastHistory?.period ?? "—";

  const what = projectedValue !== undefined && projectedLower !== undefined && projectedUpper !== undefined
    ? `Based on ${forecast.history.length} historical ${forecast.metric} periods (${historyStart}–${historyEnd}), the ${forecast.method} model projects ${formatCompact(projectedValue)} by ${lastForecast?.period ?? "end of horizon"} (${forecast.confidenceLevel * 100}% CI: ${formatCompact(projectedLower)}–${formatCompact(projectedUpper)}). Model fit: R² = ${r2Pct}.`
    : `Forecast model (${forecast.method}) generated for ${forecast.metric} with ${forecast.horizon} period horizon.`;

  const why =
    forecast.r2 > 0.8
      ? `With R² = ${r2Pct}, this forecast is highly reliable — historical patterns in ${forecast.metric} are strong enough to project forward with confidence.`
      : forecast.r2 > 0.5
      ? `R² = ${r2Pct} indicates moderate predictive strength for ${forecast.metric}. Use projections directionally, not as exact targets.`
      : `R² = ${r2Pct} suggests limited predictability — ${forecast.metric} is volatile or driven by factors not captured in the time series alone.`;

  const action = projectedValue !== undefined
    ? forecast.slope > 0
      ? `Plan for a ${formatCompact(projectedValue)} target at end of horizon — budget accordingly and set milestones to track against this projection.`
      : `Projected decline to ${formatCompact(projectedValue)} warrants attention — model scenarios for intervention to reverse the downward trend.`
    : `Review the forecast assumptions for ${forecast.metric} and validate against external benchmarks before using in planning.`;

  return { what, why, action };
}

interface ForecastChartCardProps {
  forecast: ForecastResult;
}

export function ForecastChartCard({ forecast }: ForecastChartCardProps) {
  const insight = buildForecastInsight(forecast);
  return (
    <ChartCard
      title={`${forecast.metric} Forecast`}
      description={`${forecast.method} · ${forecast.horizon} period horizon · R² ${formatPercentRaw(forecast.r2 * 100, 0)}`}
      insight={insight}
    >
      <ForecastChart forecast={forecast} />
    </ChartCard>
  );
}
