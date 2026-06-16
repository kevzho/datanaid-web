import type {
  CategoryBreakdown,
  DataRow,
  DatasetProfile,
  ParsedDataset,
  TrendAnalysis,
  TrendPoint,
} from "@/types/dataset";
import { linearRegression, numericValues, toNumber } from "./stats";
import { getColumnValues, parseDate } from "./types-infer";

/** Bucket an epoch ms into a period key for a given granularity. */
function periodKey(ms: number, gran: TrendAnalysis["granularity"]): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  switch (gran) {
    case "year":
      return `${y}`;
    case "quarter":
      return `${y}-Q${Math.floor(m / 3) + 1}`;
    case "month":
      return `${y}-${String(m + 1).padStart(2, "0")}`;
    case "week": {
      const onejan = Date.UTC(y, 0, 1);
      const week = Math.ceil(((ms - onejan) / 86_400_000 + new Date(onejan).getUTCDay() + 1) / 7);
      return `${y}-W${String(week).padStart(2, "0")}`;
    }
    default:
      return d.toISOString().slice(0, 10);
  }
}

function rollingAverage(series: TrendPoint[], window: number): void {
  for (let i = 0; i < series.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = series.slice(start, i + 1);
    series[i].rollingAvg =
      slice.reduce((acc, p) => acc + p.value, 0) / slice.length;
  }
}

/**
 * Build a trend for one numeric metric aggregated over the primary date column.
 * Aggregation = SUM per period (typical for nonprofit counts/$).
 */
export function buildTrend(
  dataset: ParsedDataset,
  dateColumn: string,
  metric: string,
  granularity: TrendAnalysis["granularity"]
): TrendAnalysis | null {
  const buckets = new Map<string, { sum: number; ms: number }>();
  for (const row of dataset.rows) {
    const ms = parseDate(row[dateColumn] ?? null);
    const val = toNumber(row[metric] ?? null);
    if (ms === null || val === null) continue;
    const key = periodKey(ms, granularity);
    const existing = buckets.get(key);
    if (existing) existing.sum += val;
    else buckets.set(key, { sum: val, ms });
  }
  if (buckets.size < 2) return null;

  const series: TrendPoint[] = [...buckets.entries()]
    .sort((a, b) => a[1].ms - b[1].ms)
    .map(([period, { sum }]) => ({ period, value: sum }));

  const window = Math.max(2, Math.round(series.length / 6));
  rollingAverage(series, window);

  const xs = series.map((_, i) => i);
  const ys = series.map((p) => p.value);
  const { slope } = linearRegression(xs, ys);

  const first = series[0].value;
  const last = series[series.length - 1].value;
  const totalGrowthPct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;

  let growthSum = 0;
  let growthN = 0;
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].value;
    if (prev !== 0) {
      growthSum += ((series[i].value - prev) / Math.abs(prev)) * 100;
      growthN++;
    }
  }
  const avgPeriodGrowthPct = growthN ? growthSum / growthN : 0;

  const peak = series.reduce((a, b) => (b.value > a.value ? b : a));
  const trough = series.reduce((a, b) => (b.value < a.value ? b : a));

  const direction: TrendAnalysis["direction"] =
    Math.abs(totalGrowthPct) < 2 ? "flat" : totalGrowthPct > 0 ? "up" : "down";

  return {
    metric,
    dateColumn,
    granularity,
    series,
    totalGrowthPct,
    avgPeriodGrowthPct,
    direction,
    slope,
    first,
    last,
    peak,
    trough,
  };
}

/** Build trends for the best metrics against the primary date column. */
export function buildTrends(dataset: ParsedDataset, profile: DatasetProfile): TrendAnalysis[] {
  if (profile.datetimeColumns.length === 0) return [];
  const dateCol = profile.datetimeColumns[0];
  const dtProfile = profile.columns.find((c) => c.name === dateCol)?.datetime;
  const granularity = dtProfile?.granularity ?? "month";
  const gran = granularity === "irregular" ? "month" : granularity;

  // Prioritize semantic numeric metrics, then fall back to all numeric.
  const semanticPriority = [
    "donations",
    "revenue",
    "grant_funding",
    "attendance",
    "volunteers",
    "clients_served",
    "beneficiaries",
    "expenses",
  ];
  const numericCols = profile.columns.filter((c) => c.type === "numeric");
  const ranked = [...numericCols].sort((a, b) => {
    const ai = a.semantic ? semanticPriority.indexOf(a.semantic) : -1;
    const bi = b.semantic ? semanticPriority.indexOf(b.semantic) : -1;
    const aScore = ai === -1 ? 99 : ai;
    const bScore = bi === -1 ? 99 : bi;
    return aScore - bScore;
  });

  const trends: TrendAnalysis[] = [];
  for (const col of ranked.slice(0, 6)) {
    const t = buildTrend(dataset, dateCol, col.name, gran);
    if (t) trends.push(t);
  }
  return trends;
}

/**
 * Category breakdowns: for each low-cardinality categorical dimension, sum the
 * top numeric metric (or count rows if no numeric metric available).
 */
export function buildCategoryBreakdowns(
  dataset: ParsedDataset,
  profile: DatasetProfile
): CategoryBreakdown[] {
  const breakdowns: CategoryBreakdown[] = [];
  const dims = profile.columns.filter(
    (c) => (c.type === "categorical" || c.type === "boolean") && c.unique >= 2 && c.unique <= 30
  );

  const metricCol =
    profile.columns.find(
      (c) =>
        c.type === "numeric" &&
        c.semantic &&
        ["donations", "revenue", "attendance", "volunteers", "clients_served"].includes(c.semantic)
    ) ?? profile.columns.find((c) => c.type === "numeric");

  for (const dim of dims.slice(0, 6)) {
    const agg = new Map<string, number>();
    for (const row of dataset.rows) {
      const cat = row[dim.name];
      if (cat === null) continue;
      const key = String(cat);
      const val = metricCol ? toNumber(row[metricCol.name] ?? null) ?? 0 : 1;
      agg.set(key, (agg.get(key) ?? 0) + val);
    }
    const total = [...agg.values()].reduce((a, b) => a + b, 0);
    if (total === 0) continue;
    const items = [...agg.entries()]
      .map(([category, value]) => ({ category, value, pct: (value / total) * 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
    breakdowns.push({
      dimension: dim.name,
      metric: metricCol?.name,
      items,
      total,
    });
  }
  return breakdowns;
}

export function getNumericColumnArray(dataset: ParsedDataset, column: string): number[] {
  return numericValues(getColumnValues(dataset.rows, column));
}
