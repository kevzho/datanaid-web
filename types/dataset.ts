/**
 * Core dataset & analysis type definitions for Datanaid.
 * Every analytical result the UI renders is described here so the
 * frontend and the analysis engine stay in lockstep.
 */

export type ColumnType = "numeric" | "categorical" | "datetime" | "boolean" | "text";

export type CellValue = string | number | boolean | null;

export type DataRow = Record<string, CellValue>;

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  /** Inferred semantic role (nonprofit intelligence layer). */
  semantic?: SemanticRole;
  count: number;
  missing: number;
  missingPct: number;
  unique: number;
  uniquePct: number;
  /** Numeric-only stats. */
  numeric?: NumericStats;
  /** Categorical-only stats. */
  categorical?: CategoricalStats;
  /** Datetime-only stats. */
  datetime?: DatetimeStats;
  sampleValues: CellValue[];
}

export interface NumericStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  q1: number;
  q3: number;
  iqr: number;
  sum: number;
  zeros: number;
  negatives: number;
  /** Histogram bins for distribution charts. */
  histogram: HistogramBin[];
}

export interface HistogramBin {
  start: number;
  end: number;
  label: string;
  count: number;
}

export interface CategoricalStats {
  topValues: ValueCount[];
  mode: string;
  modeFreq: number;
}

export interface ValueCount {
  value: string;
  count: number;
  pct: number;
}

export interface DatetimeStats {
  min: string;
  max: string;
  rangeDays: number;
  /** Detected granularity. */
  granularity: "day" | "week" | "month" | "quarter" | "year" | "irregular";
}

/** Nonprofit semantic roles — auto-detected from column names + content. */
export type SemanticRole =
  | "donations"
  | "volunteers"
  | "clients_served"
  | "attendance"
  | "revenue"
  | "expenses"
  | "programs"
  | "beneficiaries"
  | "grant_funding"
  | "date"
  | "location"
  | "category"
  | "unknown";

export interface DatasetProfile {
  fileName: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  totalMissing: number;
  totalMissingPct: number;
  duplicateRows: number;
  duplicatePct: number;
  numericColumns: string[];
  categoricalColumns: string[];
  datetimeColumns: string[];
  memoryEstimateKb: number;
  qualityScore: QualityScore;
  detectedDomains: SemanticRole[];
}

export interface QualityScore {
  /** 0–100 overall score. */
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
  components: {
    completeness: number; // % non-missing
    uniqueness: number; // 100 - duplicate%
    consistency: number; // type consistency
    validity: number; // valid values / ranges
  };
  issues: QualityIssue[];
}

export interface QualityIssue {
  severity: "high" | "medium" | "low";
  column?: string;
  type:
    | "missing_values"
    | "duplicate_rows"
    | "type_inconsistency"
    | "outliers"
    | "constant_column"
    | "high_cardinality"
    | "mixed_types";
  message: string;
  affected: number;
}

/** ── Analysis results ──────────────────────────────────────── */

export interface MissingValueReport {
  byColumn: { column: string; missing: number; missingPct: number }[];
  totalMissing: number;
  totalCells: number;
  worstColumn?: string;
}

export interface DuplicateReport {
  duplicateRows: number;
  duplicatePct: number;
  exampleIndices: number[];
}

export interface OutlierReport {
  column: string;
  iqrOutliers: number;
  zScoreOutliers: number;
  lowerBound: number;
  upperBound: number;
  examples: { index: number; value: number; method: "iqr" | "zscore" }[];
}

export interface TypeIssueReport {
  column: string;
  declaredType: ColumnType;
  conflictingCount: number;
  examples: CellValue[];
}

/** ── Trends & time series ──────────────────────────────────── */

export interface TrendPoint {
  period: string;
  value: number;
  rollingAvg?: number;
}

export interface TrendAnalysis {
  metric: string;
  dateColumn: string;
  granularity: DatetimeStats["granularity"];
  series: TrendPoint[];
  totalGrowthPct: number;
  avgPeriodGrowthPct: number;
  direction: "up" | "down" | "flat";
  slope: number;
  first: number;
  last: number;
  peak: TrendPoint;
  trough: TrendPoint;
}

export interface CategoryBreakdown {
  dimension: string;
  metric?: string;
  items: { category: string; value: number; pct: number }[];
  total: number;
}

/** ── ML ────────────────────────────────────────────────────── */

export interface ClusterResult {
  features: string[];
  k: number;
  assignments: number[];
  centroids: number[][];
  clusterSizes: number[];
  inertia: number;
  silhouette: number;
  /** 2D projection points for plotting. */
  points: { x: number; y: number; cluster: number; index: number }[];
}

export interface AnomalyResult {
  method: "isolation" | "lof";
  features: string[];
  scores: number[];
  threshold: number;
  anomalyIndices: number[];
  anomalyCount: number;
  anomalyPct: number;
}

export interface ForecastPoint {
  period: string;
  value: number;
  lower: number;
  upper: number;
  isForecast: boolean;
}

export interface ForecastResult {
  metric: string;
  dateColumn: string;
  method: "linear" | "prophet" | "xgboost";
  history: ForecastPoint[];
  forecast: ForecastPoint[];
  horizon: number;
  slope: number;
  r2: number;
  confidenceLevel: number;
}

/** ── Insights ──────────────────────────────────────────────── */

export type InsightCategory =
  | "finding"
  | "trend"
  | "risk"
  | "opportunity"
  | "recommendation";

/** The grounded insight contract — every field must trace to a computed stat. */
export interface Insight {
  id: string;
  category: InsightCategory;
  /** Required structured contract from the master prompt. */
  finding: string;
  evidence: string;
  importance: "high" | "medium" | "low";
  recommended_action: string;
  /** Provenance — the exact metric + value this insight is grounded in. */
  metric: string;
  value: string | number;
  column?: string;
  /** True when phrased by an LLM (still grounded), false when template-only. */
  phrased?: boolean;
}

export interface InsightBundle {
  generatedAt: string;
  grounded: true;
  insights: Insight[];
  byCategory: Record<InsightCategory, Insight[]>;
}

/** ── Top-level analysis container ──────────────────────────── */

export interface AnalysisResult {
  id: string;
  fileName: string;
  createdAt: string;
  rowCount: number;
  columnCount: number;
  profile: DatasetProfile;
  missing: MissingValueReport;
  duplicates: DuplicateReport;
  outliers: OutlierReport[];
  typeIssues: TypeIssueReport[];
  trends: TrendAnalysis[];
  categories: CategoryBreakdown[];
  forecasts: ForecastResult[];
  clusters?: ClusterResult;
  anomalies?: AnomalyResult;
  insights: InsightBundle;
  /** Headline KPIs for the dashboard. */
  kpis: KPI[];
}

export interface KPI {
  label: string;
  value: string;
  rawValue: number;
  delta?: number;
  deltaLabel?: string;
  direction?: "up" | "down" | "flat";
  hint?: string;
  semantic?: SemanticRole;
}

/** Stored dataset payload (parsed, kept in memory / blob). */
export interface ParsedDataset {
  fileName: string;
  headers: string[];
  rows: DataRow[];
}
