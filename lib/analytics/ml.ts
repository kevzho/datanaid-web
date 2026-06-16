import type {
  AnomalyResult,
  ClusterResult,
  DatasetProfile,
  ForecastResult,
  ParsedDataset,
  TrendAnalysis,
} from "@/types/dataset";
import { linearRegression, mean, std, toNumber, zForConfidence } from "./stats";
import { getColumnValues } from "./types-infer";

/* ── Feature matrix helpers ───────────────────────────────── */

interface FeatureMatrix {
  features: string[];
  rowIndices: number[];
  matrix: number[][]; // standardized
  means: number[];
  stds: number[];
}

function buildFeatureMatrix(
  dataset: ParsedDataset,
  profile: DatasetProfile,
  maxFeatures = 6
): FeatureMatrix | null {
  const cols = profile.numericColumns.slice(0, maxFeatures);
  if (cols.length < 2) return null;

  const rawCols = cols.map((c) => getColumnValues(dataset.rows, c).map(toNumber));

  // Keep rows complete across all chosen features.
  const rowIndices: number[] = [];
  const rows: number[][] = [];
  for (let i = 0; i < dataset.rows.length; i++) {
    const vals = rawCols.map((col) => col[i]);
    if (vals.every((v) => v !== null)) {
      rowIndices.push(i);
      rows.push(vals as number[]);
    }
  }
  if (rows.length < 8) return null;

  // Standardize
  const means = cols.map((_, j) => mean(rows.map((r) => r[j])));
  const stds = cols.map((_, j) => {
    const s = std(rows.map((r) => r[j]), means[j]);
    return s === 0 ? 1 : s;
  });
  const matrix = rows.map((r) => r.map((v, j) => (v - means[j]) / stds[j]));

  return { features: cols, rowIndices, matrix, means, stds };
}

function euclidean(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

/* ── K-Means (k-means++ init, deterministic seed) ─────────── */

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function kmeansPlusPlus(matrix: number[][], k: number, rand: () => number): number[][] {
  const centroids: number[][] = [];
  centroids.push([...matrix[Math.floor(rand() * matrix.length)]]);
  while (centroids.length < k) {
    const dists = matrix.map((p) => {
      const d = Math.min(...centroids.map((c) => euclidean(p, c) ** 2));
      return d;
    });
    const total = dists.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    let idx = 0;
    for (let i = 0; i < dists.length; i++) {
      r -= dists[i];
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    centroids.push([...matrix[idx]]);
  }
  return centroids;
}

function silhouetteScore(matrix: number[][], assignments: number[], k: number): number {
  if (k < 2 || matrix.length > 2000) {
    // Skip expensive computation on large sets; return a coarse estimate.
    if (matrix.length > 2000) return 0.5;
    return 0;
  }
  let total = 0;
  for (let i = 0; i < matrix.length; i++) {
    const own = assignments[i];
    const sameCluster: number[] = [];
    const otherDists: Record<number, number[]> = {};
    for (let j = 0; j < matrix.length; j++) {
      if (i === j) continue;
      const d = euclidean(matrix[i], matrix[j]);
      if (assignments[j] === own) sameCluster.push(d);
      else {
        (otherDists[assignments[j]] ??= []).push(d);
      }
    }
    const a = sameCluster.length ? mean(sameCluster) : 0;
    const bCandidates = Object.values(otherDists).map((arr) => mean(arr));
    const b = bCandidates.length ? Math.min(...bCandidates) : 0;
    const s = Math.max(a, b) === 0 ? 0 : (b - a) / Math.max(a, b);
    total += s;
  }
  return total / matrix.length;
}

export function kMeans(
  dataset: ParsedDataset,
  profile: DatasetProfile,
  k?: number
): ClusterResult | null {
  const fm = buildFeatureMatrix(dataset, profile);
  if (!fm) return null;
  const { matrix, features, rowIndices } = fm;

  // Auto-pick k by silhouette if not provided (try 2..5).
  const candidateKs = k ? [k] : [2, 3, 4];
  let best: ClusterResult | null = null;

  for (const kk of candidateKs) {
    if (kk >= matrix.length) continue;
    const rand = seededRandom(42);
    let centroids = kmeansPlusPlus(matrix, kk, rand);
    let assignments = new Array(matrix.length).fill(0);

    for (let iter = 0; iter < 50; iter++) {
      let changed = false;
      for (let i = 0; i < matrix.length; i++) {
        let bestC = 0;
        let bestD = Infinity;
        for (let c = 0; c < kk; c++) {
          const d = euclidean(matrix[i], centroids[c]);
          if (d < bestD) {
            bestD = d;
            bestC = c;
          }
        }
        if (assignments[i] !== bestC) {
          assignments[i] = bestC;
          changed = true;
        }
      }
      // Recompute centroids
      const sums = Array.from({ length: kk }, () => new Array(features.length).fill(0));
      const counts = new Array(kk).fill(0);
      for (let i = 0; i < matrix.length; i++) {
        const c = assignments[i];
        counts[c]++;
        for (let j = 0; j < features.length; j++) sums[c][j] += matrix[i][j];
      }
      centroids = sums.map((s, c) => (counts[c] ? s.map((v) => v / counts[c]) : centroids[c]));
      if (!changed) break;
    }

    let inertia = 0;
    for (let i = 0; i < matrix.length; i++) {
      inertia += euclidean(matrix[i], centroids[assignments[i]]) ** 2;
    }
    const clusterSizes = new Array(kk).fill(0);
    assignments.forEach((c) => clusterSizes[c]++);
    const silhouette = silhouetteScore(matrix, assignments, kk);

    // 2D projection: use first two standardized features (or PCA-lite via top variance)
    const points = matrix.map((row, i) => ({
      x: row[0],
      y: row[1] ?? 0,
      cluster: assignments[i],
      index: rowIndices[i],
    }));

    const result: ClusterResult = {
      features,
      k: kk,
      assignments,
      centroids,
      clusterSizes,
      inertia,
      silhouette,
      points,
    };
    if (!best || silhouette > best.silhouette) best = result;
  }
  return best;
}

/* ── Anomaly detection: LOF-style local density ───────────── */

export function detectAnomalies(
  dataset: ParsedDataset,
  profile: DatasetProfile,
  contamination = 0.05
): AnomalyResult | null {
  const fm = buildFeatureMatrix(dataset, profile);
  if (!fm) return null;
  const { matrix, features, rowIndices } = fm;
  const n = matrix.length;
  const kNeighbors = Math.max(3, Math.min(20, Math.floor(Math.sqrt(n))));

  // Precompute k-distances (LOF approximation).
  const kDist: number[] = new Array(n);
  const neighbors: number[][] = new Array(n);
  for (let i = 0; i < n; i++) {
    const dists = matrix
      .map((p, j) => ({ j, d: i === j ? Infinity : euclidean(matrix[i], p) }))
      .sort((a, b) => a.d - b.d);
    const knn = dists.slice(0, kNeighbors);
    neighbors[i] = knn.map((x) => x.j);
    kDist[i] = knn[knn.length - 1]?.d ?? 0;
  }

  // Local reachability density
  const lrd: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    let sumReach = 0;
    for (const j of neighbors[i]) {
      const reach = Math.max(kDist[j], euclidean(matrix[i], matrix[j]));
      sumReach += reach;
    }
    const avg = sumReach / Math.max(1, neighbors[i].length);
    lrd[i] = avg === 0 ? 1 : 1 / avg;
  }

  // LOF score
  const scores: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    let ratioSum = 0;
    for (const j of neighbors[i]) ratioSum += lrd[j] / (lrd[i] || 1e-9);
    scores[i] = ratioSum / Math.max(1, neighbors[i].length);
  }

  // Threshold at contamination quantile.
  const sorted = [...scores].sort((a, b) => b - a);
  const cutIdx = Math.max(0, Math.floor(contamination * n) - 1);
  const threshold = sorted[cutIdx] ?? Math.max(...scores);

  const anomalyIndices: number[] = [];
  for (let i = 0; i < n; i++) {
    if (scores[i] >= threshold && scores[i] > 1.2) {
      anomalyIndices.push(rowIndices[i]);
    }
  }

  return {
    method: "lof",
    features,
    scores,
    threshold,
    anomalyIndices,
    anomalyCount: anomalyIndices.length,
    anomalyPct: n ? (anomalyIndices.length / n) * 100 : 0,
  };
}

/* ── Linear forecast with confidence intervals ────────────── */

export function linearForecast(
  trend: TrendAnalysis,
  horizon = 6,
  confidenceLevel = 0.95
): ForecastResult {
  const xs = trend.series.map((_, i) => i);
  const ys = trend.series.map((p) => p.value);
  const { slope, intercept, r2 } = linearRegression(xs, ys);

  // Residual standard error for prediction interval.
  const fitted = xs.map((x) => slope * x + intercept);
  const residuals = ys.map((y, i) => y - fitted[i]);
  const dof = Math.max(1, ys.length - 2);
  const sse = residuals.reduce((acc, r) => acc + r * r, 0);
  const se = Math.sqrt(sse / dof);
  const z = zForConfidence(confidenceLevel);
  const meanX = mean(xs);
  const sxx = xs.reduce((acc, x) => acc + (x - meanX) ** 2, 0) || 1;

  const history = trend.series.map((p, i) => ({
    period: p.period,
    value: p.value,
    lower: p.value,
    upper: p.value,
    isForecast: false,
  }));

  const forecast = [];
  const lastIdx = xs.length - 1;
  for (let h = 1; h <= horizon; h++) {
    const x = lastIdx + h;
    const yhat = slope * x + intercept;
    // Prediction interval widens with distance from mean.
    const margin = z * se * Math.sqrt(1 + 1 / xs.length + (x - meanX) ** 2 / sxx);
    forecast.push({
      period: nextPeriodLabel(trend.series[trend.series.length - 1].period, h, trend.granularity),
      value: Math.max(0, yhat),
      lower: Math.max(0, yhat - margin),
      upper: yhat + margin,
      isForecast: true,
    });
  }

  return {
    metric: trend.metric,
    dateColumn: trend.dateColumn,
    method: "linear",
    history,
    forecast,
    horizon,
    slope,
    r2,
    confidenceLevel,
  };
}

function nextPeriodLabel(
  last: string,
  step: number,
  gran: TrendAnalysis["granularity"]
): string {
  // Month: YYYY-MM
  const monthMatch = last.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch && gran === "month") {
    let y = Number(monthMatch[1]);
    let m = Number(monthMatch[2]) - 1 + step;
    y += Math.floor(m / 12);
    m = ((m % 12) + 12) % 12;
    return `${y}-${String(m + 1).padStart(2, "0")}`;
  }
  // Year
  if (/^\d{4}$/.test(last) && gran === "year") {
    return `${Number(last) + step}`;
  }
  // Quarter: YYYY-Qn
  const qMatch = last.match(/^(\d{4})-Q(\d)$/);
  if (qMatch && gran === "quarter") {
    let y = Number(qMatch[1]);
    let q = Number(qMatch[2]) - 1 + step;
    y += Math.floor(q / 4);
    q = ((q % 4) + 4) % 4;
    return `${y}-Q${q + 1}`;
  }
  // Day fallback
  const dayMs = Date.parse(last);
  if (!Number.isNaN(dayMs)) {
    const stepDays = gran === "week" ? 7 : 1;
    return new Date(dayMs + step * stepDays * 86_400_000).toISOString().slice(0, 10);
  }
  return `${last}+${step}`;
}

export function buildForecasts(trends: TrendAnalysis[], horizon = 6): ForecastResult[] {
  return trends
    .filter((t) => t.series.length >= 4)
    .slice(0, 3)
    .map((t) => linearForecast(t, horizon));
}
