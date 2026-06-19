import type {
  AnalysisResult,
  CategoryNormalizationIssue,
  DatasetProfile,
  OutlierReport,
  ParsedDataset,
} from "@/types/dataset";
import { profileDataset } from "./profiling";
import {
  analyzeDuplicates,
  analyzeMissing,
  analyzeOutliers,
  analyzeTypeIssues,
} from "./analysis";
import { buildCategoryBreakdowns, buildTrends } from "./trends";
import { buildForecasts, detectAnomalies, kMeans } from "./ml";
import { buildKPIs } from "./kpi";
import { bundleInsights, generateGroundedInsights } from "./insights";
import { inferColumnType } from "./types-infer";

export interface EngineOptions {
  forecastHorizon?: number;
  runClustering?: boolean;
  runAnomaly?: boolean;
}

function normalizeCategoryLabel(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) return cleaned;
  return cleaned
    .toLowerCase()
    .split(/([\s/_-]+)/)
    .map((part) => (/^[a-z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join("");
}

function normalizeCategoricalLabels(dataset: ParsedDataset): {
  dataset: ParsedDataset;
  issues: CategoryNormalizationIssue[];
} {
  const categoricalHeaders = dataset.headers.filter((header) => {
    const values = dataset.rows.map((row) => row[header] ?? null);
    const type = inferColumnType(values);
    return type === "categorical" || type === "boolean" || type === "text";
  });

  const variantMap = new Map<string, Map<string, number>>();
  const rows = dataset.rows.map((row) => {
    const next = { ...row };
    for (const header of categoricalHeaders) {
      const value = row[header];
      if (typeof value !== "string") continue;
      const normalized = normalizeCategoryLabel(value);
      if (!normalized || normalized === value) continue;
      next[header] = normalized;
      const key = `${header}\u0001${normalized}`;
      const variants = variantMap.get(key) ?? new Map<string, number>();
      variants.set(value, (variants.get(value) ?? 0) + 1);
      variants.set(normalized, variants.get(normalized) ?? 0);
      variantMap.set(key, variants);
    }
    return next;
  });

  const issues: CategoryNormalizationIssue[] = [];
  for (const [key, variants] of variantMap.entries()) {
    const [column, normalizedValue] = key.split("\u0001");
    const variantNames = [...variants.keys()].filter((v) => v !== normalizedValue);
    if (variantNames.length === 0) continue;
    issues.push({
      column,
      normalizedValue,
      variants: [normalizedValue, ...variantNames].slice(0, 6),
      affected: [...variants.values()].reduce((acc, n) => acc + n, 0),
    });
  }

  return {
    dataset: { ...dataset, rows },
    issues,
  };
}

function gradeFor(score: number): DatasetProfile["qualityScore"]["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function applyOutlierQualityCap(profile: DatasetProfile, outliers: OutlierReport[]): void {
  const meaningful = outliers.filter((o) => {
    const column = profile.columns.find((c) => c.name === o.column);
    if (!column) return false;
    const observed = Math.max(1, column.count - column.missing);
    return o.iqrOutliers >= 2 && (o.iqrOutliers / observed) * 100 >= 2;
  });
  if (meaningful.length === 0) return;

  const worst = meaningful[0];
  profile.qualityScore.issues.push({
    severity: meaningful.length >= 3 ? "medium" : "low",
    column: worst.column,
    type: "outliers",
    message: `${worst.column} includes ${worst.iqrOutliers.toLocaleString()} meaningful statistical outlier(s), so board-facing totals should include outlier-aware context.`,
    affected: worst.iqrOutliers,
  });
  profile.qualityScore.components.validity = Math.min(profile.qualityScore.components.validity, 95);
  profile.qualityScore.overall = Math.min(profile.qualityScore.overall, 95);
  profile.qualityScore.grade = gradeFor(profile.qualityScore.overall);
}

/**
 * The complete, deterministic analysis pipeline. Runs entirely client- or
 * server-side with no external dependency. The optional LLM phrasing layer is
 * applied separately (server-only) so this stays pure and testable.
 */
export function runAnalysis(dataset: ParsedDataset, options: EngineOptions = {}): AnalysisResult {
  const { forecastHorizon = 6, runClustering = true, runAnomaly = true } = options;
  const normalized = normalizeCategoricalLabels(dataset);
  const analysisDataset = normalized.dataset;

  const profile = profileDataset(analysisDataset, normalized.issues);
  const missing = analyzeMissing(analysisDataset, profile);
  const duplicates = analyzeDuplicates(analysisDataset, profile);
  const outliers = analyzeOutliers(analysisDataset, profile);
  const typeIssues = analyzeTypeIssues(analysisDataset, profile);

  applyOutlierQualityCap(profile, outliers);

  const trends = buildTrends(analysisDataset, profile);
  const categories = buildCategoryBreakdowns(analysisDataset, profile);
  const forecasts = buildForecasts(trends, forecastHorizon);

  const clusters = runClustering ? kMeans(analysisDataset, profile) ?? undefined : undefined;
  const anomalies = runAnomaly ? detectAnomalies(analysisDataset, profile) ?? undefined : undefined;

  const kpis = buildKPIs(analysisDataset, profile, trends);

  const groundedInsights = generateGroundedInsights(
    analysisDataset,
    profile,
    trends,
    outliers,
    forecasts,
    anomalies
  );
  const insights = bundleInsights(groundedInsights);

  return {
    id: cryptoId(),
    fileName: dataset.fileName,
    createdAt: new Date().toISOString(),
    rowCount: profile.rowCount,
    columnCount: profile.columnCount,
    profile,
    missing,
    duplicates,
    outliers,
    typeIssues,
    trends,
    categories,
    forecasts,
    clusters,
    anomalies,
    insights,
    kpis,
  };
}

function cryptoId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* noop */
  }
  return `an_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
