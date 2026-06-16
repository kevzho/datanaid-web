import type { AnalysisResult, ParsedDataset } from "@/types/dataset";
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

export interface EngineOptions {
  forecastHorizon?: number;
  runClustering?: boolean;
  runAnomaly?: boolean;
}

/**
 * The complete, deterministic analysis pipeline. Runs entirely client- or
 * server-side with no external dependency. The optional LLM phrasing layer is
 * applied separately (server-only) so this stays pure and testable.
 */
export function runAnalysis(dataset: ParsedDataset, options: EngineOptions = {}): AnalysisResult {
  const { forecastHorizon = 6, runClustering = true, runAnomaly = true } = options;

  const profile = profileDataset(dataset);
  const missing = analyzeMissing(dataset, profile);
  const duplicates = analyzeDuplicates(dataset, profile);
  const outliers = analyzeOutliers(dataset, profile);
  const typeIssues = analyzeTypeIssues(dataset, profile);

  const trends = buildTrends(dataset, profile);
  const categories = buildCategoryBreakdowns(dataset, profile);
  const forecasts = buildForecasts(trends, forecastHorizon);

  const clusters = runClustering ? kMeans(dataset, profile) ?? undefined : undefined;
  const anomalies = runAnomaly ? detectAnomalies(dataset, profile) ?? undefined : undefined;

  const kpis = buildKPIs(dataset, profile, trends);

  const groundedInsights = generateGroundedInsights(dataset, profile, trends, outliers);
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
