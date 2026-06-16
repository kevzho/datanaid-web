import type { CellValue, HistogramBin } from "@/types/dataset";

/** Numeric coercion that respects our null sentinels. */
export function toNumber(v: CellValue): number | null {
  if (v === null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return v ? 1 : 0;
  const cleaned = String(v).replace(/[$,%\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function numericValues(values: CellValue[]): number[] {
  const out: number[] = [];
  for (const v of values) {
    const n = toNumber(v);
    if (n !== null) out.push(n);
  }
  return out;
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function std(xs: number[], sampleMean?: number): number {
  if (xs.length < 2) return 0;
  const m = sampleMean ?? mean(xs);
  const variance = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/** Linear-interpolated percentile (type-7, like numpy default). */
export function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return NaN;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const pos = (sortedAsc.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedAsc[base + 1] !== undefined) {
    return sortedAsc[base] + rest * (sortedAsc[base + 1] - sortedAsc[base]);
  }
  return sortedAsc[base];
}

export function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  return quantile(sorted, 0.5);
}

export interface FiveNumber {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
}

export function fiveNumberSummary(xs: number[]): FiveNumber {
  const sorted = [...xs].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  return {
    min: sorted[0],
    q1,
    median: quantile(sorted, 0.5),
    q3,
    max: sorted[sorted.length - 1],
    iqr: q3 - q1,
  };
}

/** Freedman–Diaconis-ish histogram, capped at maxBins. */
export function histogram(xs: number[], maxBins = 12): HistogramBin[] {
  if (xs.length === 0) return [];
  const sorted = [...xs].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) {
    return [{ start: min, end: max, label: fmtRange(min, max), count: xs.length }];
  }
  const { iqr } = fiveNumberSummary(sorted);
  let binWidth = (2 * iqr) / Math.cbrt(xs.length);
  let binCount = binWidth > 0 ? Math.ceil((max - min) / binWidth) : 10;
  binCount = Math.max(4, Math.min(maxBins, binCount));
  binWidth = (max - min) / binCount;

  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => {
    const start = min + i * binWidth;
    const end = i === binCount - 1 ? max : start + binWidth;
    return { start, end, label: fmtRange(start, end), count: 0 };
  });
  for (const x of xs) {
    let idx = Math.floor((x - min) / binWidth);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }
  return bins;
}

function fmtRange(a: number, b: number): string {
  const f = (n: number) =>
    Math.abs(n) >= 1000 || Number.isInteger(n)
      ? Math.round(n).toLocaleString()
      : n.toFixed(1);
  return `${f(a)}–${f(b)}`;
}

/** Pearson correlation. Returns NaN if undefined. */
export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return NaN;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? NaN : num / denom;
}

/** Ordinary least squares slope/intercept/r² for y ~ x. */
export interface LinearFit {
  slope: number;
  intercept: number;
  r2: number;
}

export function linearRegression(xs: number[], ys: number[]): LinearFit {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = sxx === 0 || syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2 };
}

/** Standard normal quantile (for confidence interval z-scores). */
export function zForConfidence(level: number): number {
  // Common levels mapped; fall back to 1.96.
  const table: Record<string, number> = {
    "0.8": 1.2816,
    "0.9": 1.6449,
    "0.95": 1.96,
    "0.99": 2.5758,
  };
  return table[String(level)] ?? 1.96;
}

export function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
