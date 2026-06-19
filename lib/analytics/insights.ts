import type {
  AnomalyResult,
  DatasetProfile,
  ForecastResult,
  Insight,
  InsightBundle,
  InsightCategory,
  InsightConfidence,
  InsightSeverity,
  InsightType,
  OutlierReport,
  ParsedDataset,
  TrendAnalysis,
  TrendPoint,
} from "@/types/dataset";
import { formatCompact, formatCurrency, formatNumber, formatPercentRaw } from "@/lib/utils";
import { median, mean, std, toNumber } from "./stats";

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

const MONEY = new Set(["donations", "revenue", "expenses", "grant_funding"]);

function fmtMetricValue(role: string | undefined, value: number): string {
  return role && MONEY.has(role) ? formatCurrency(value) : formatCompact(value);
}

function humanizeRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function severityFromScore(score: number): InsightSeverity {
  if (score >= 80) return "low";
  if (score >= 60) return "medium";
  return "high";
}

function confidenceFromScore(score: number): InsightConfidence {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function makeInsight(input: {
  idPrefix: string;
  title: string;
  type: InsightType;
  severity: InsightSeverity;
  confidence: InsightConfidence;
  what_happened: string;
  evidence: string;
  what_contributed: string;
  potential_explanations?: string[];
  requires_investigation: boolean;
  why_it_matters: string;
  recommended_action: string;
  metric: string;
  value: string | number;
  column?: string;
}): Insight {
  return {
    id: id(input.idPrefix),
    title: input.title,
    type: input.type,
    severity: input.severity,
    confidence: input.confidence,
    what_happened: input.what_happened,
    evidence: input.evidence,
    what_contributed: input.what_contributed,
    potential_explanations: input.potential_explanations ?? [],
    requires_investigation: input.requires_investigation,
    why_it_matters: input.why_it_matters,
    recommended_action: input.recommended_action,
    category: input.type,
    finding: input.what_happened,
    importance: input.severity,
    metric: input.metric,
    value: input.value,
    column: input.column,
  };
}

function periodChanges(series: TrendPoint[]): number[] {
  const changes: number[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].value;
    if (prev !== 0) changes.push(((series[i].value - prev) / Math.abs(prev)) * 100);
  }
  return changes;
}

function medianPeriodGrowthPct(series: TrendPoint[]): number {
  const changes = periodChanges(series).filter((v) => Number.isFinite(v));
  return changes.length ? median(changes) : 0;
}

function trendConsistency(t: TrendAnalysis): number {
  const changes = periodChanges(t.series).filter((v) => Math.abs(v) >= 1);
  if (changes.length === 0 || t.direction === "flat") return 0;
  const sign = t.direction === "up" ? 1 : -1;
  return changes.filter((v) => Math.sign(v) === sign).length / changes.length;
}

function robustEventPoints(series: TrendPoint[]): TrendPoint[] {
  if (series.length < 4) return [];
  const values = series.map((p) => p.value);
  const med = median(values);
  const deviations = values.map((v) => Math.abs(v - med));
  const mad = median(deviations) || std(values, mean(values)) || 1;
  return series.filter((p) => Math.abs(p.value - med) / mad >= 3);
}

function classifyTrend(t: TrendAnalysis): {
  classification: "trend" | "event" | "flat";
  consistency: number;
  eventPoints: TrendPoint[];
} {
  const consistency = trendConsistency(t);
  const eventPoints = robustEventPoints(t.series);
  const largeEventShare = eventPoints.length / Math.max(1, t.series.length);
  const materialGrowth = Math.abs(t.totalGrowthPct) >= 8 || Math.abs(t.avgPeriodGrowthPct) >= 4;

  if (eventPoints.length > 0 && consistency < 0.6) {
    return { classification: "event", consistency, eventPoints };
  }
  if (t.series.length >= 4 && materialGrowth && consistency >= 0.6 && largeEventShare <= 0.25) {
    return { classification: "trend", consistency, eventPoints };
  }
  if (eventPoints.length > 0) return { classification: "event", consistency, eventPoints };
  return { classification: "flat", consistency, eventPoints };
}

function coefficientOfVariation(values: number[]): number {
  const m = Math.abs(mean(values));
  if (!m) return 1;
  return Math.abs(std(values, mean(values)) / m);
}

function insightConfidence(params: {
  consistency?: number;
  values?: number[];
  outlierRatePct?: number;
  missingPct?: number;
  anomalyPct?: number;
  forecastR2?: number;
}): InsightConfidence {
  let score = 85;
  if (params.consistency !== undefined) score -= (1 - params.consistency) * 30;
  if (params.values && params.values.length >= 2) {
    score -= Math.min(25, coefficientOfVariation(params.values) * 12);
  }
  score -= Math.min(20, (params.outlierRatePct ?? 0) * 1.5);
  score -= Math.min(20, (params.missingPct ?? 0) * 0.8);
  score -= Math.min(15, (params.anomalyPct ?? 0) * 1.2);
  if (params.forecastR2 !== undefined) score -= Math.max(0, 0.7 - params.forecastR2) * 25;
  return confidenceFromScore(score);
}

function outlierRateFor(column: string, profile: DatasetProfile, outliers: OutlierReport[]): number {
  const report = outliers.find((o) => o.column === column);
  const col = profile.columns.find((c) => c.name === column);
  if (!report || !col) return 0;
  const n = Math.max(1, col.count - col.missing);
  return (report.iqrOutliers / n) * 100;
}

function missingPctFor(column: string, profile: DatasetProfile): number {
  return profile.columns.find((c) => c.name === column)?.missingPct ?? profile.totalMissingPct;
}

function outlierAwareContext(
  dataset: ParsedDataset,
  column: string,
  report?: OutlierReport
): { rawSum: number; filteredSum: number; medianValue: number; removed: number; total: number } | null {
  const values = dataset.rows
    .map((row) => toNumber(row[column] ?? null))
    .filter((v): v is number => v !== null);
  if (values.length === 0) return null;

  const rawSum = values.reduce((acc, v) => acc + v, 0);
  const filtered = report
    ? values.filter((v) => v >= report.lowerBound && v <= report.upperBound)
    : values;

  return {
    rawSum,
    filteredSum: filtered.reduce((acc, v) => acc + v, 0),
    medianValue: median(values),
    removed: values.length - filtered.length,
    total: values.length,
  };
}

function trendSentence(t: TrendAnalysis): string {
  if (t.direction === "up") return "increased";
  if (t.direction === "down") return "decreased";
  return "remained broadly stable";
}

/**
 * DETERMINISTIC insight generation.
 * Every insight is computed directly from statistics. The optional LLM layer may
 * only rephrase selected prose fields and is guarded against new numbers.
 */
export function generateGroundedInsights(
  dataset: ParsedDataset,
  profile: DatasetProfile,
  trends: TrendAnalysis[],
  outliers: OutlierReport[],
  forecasts: ForecastResult[] = [],
  anomalies?: AnomalyResult
): Insight[] {
  counter = 0;
  const insights: Insight[] = [];
  const domains = profile.detectedDomains.filter((d) => d !== "unknown");
  const anomalyPct = anomalies?.anomalyPct ?? 0;

  insights.push(
    makeInsight({
      idPrefix: "find",
      title: "Dataset Scope",
      type: "finding",
      severity: "medium",
      confidence: profile.totalMissingPct === 0 ? "high" : "medium",
      what_happened: `The file contains ${formatNumber(profile.rowCount)} records across ${profile.columnCount} fields.`,
      evidence: `${profile.numericColumns.length} numeric, ${profile.categoricalColumns.length} categorical, and ${profile.datetimeColumns.length} date column(s) were detected during profiling.`,
      what_contributed:
        "This is a structural description of the uploaded file, not an outcome explanation.",
      requires_investigation: false,
      why_it_matters:
        "Board-facing interpretation depends on confirming what each row represents.",
      recommended_action:
        "Confirm the record granularity before using totals in external reporting.",
      metric: "row_count",
      value: profile.rowCount,
    })
  );

  if (domains.length > 0) {
    insights.push(
      makeInsight({
        idPrefix: "find",
        title: "Detected Reporting Domains",
        type: "finding",
        severity: "low",
        confidence: "medium",
        what_happened: `Datanaid detected nonprofit reporting signals: ${domains.map(humanizeRole).join(", ")}.`,
        evidence: `Semantic detection matched columns to roles: ${domains.join(", ")}.`,
        what_contributed:
          "Column names and inferred data types matched known nonprofit metric patterns.",
        requires_investigation: true,
        potential_explanations: [
          "Column naming may reflect program, finance, or fundraising workflows.",
        ],
        why_it_matters:
          "Detected domains determine which metrics are emphasized in the report.",
        recommended_action:
          "Review the detected domains and rename ambiguous columns before sharing externally.",
        metric: "detected_domains",
        value: domains.join(", "),
      })
    );
  }

  for (const c of profile.columns) {
    if (c.type !== "numeric" || !c.numeric || !c.semantic || c.semantic === "unknown") continue;
    const report = outliers.find((o) => o.column === c.name);
    const context = outlierAwareContext(dataset, c.name, report);
    const outlierRatePct = outlierRateFor(c.name, profile, outliers);
    const money = MONEY.has(c.semantic);
    const evidenceParts = [
      `Raw total = ${fmtMetricValue(c.semantic, c.numeric.sum)}`,
      `mean = ${fmtMetricValue(c.semantic, c.numeric.mean)}`,
      `median = ${fmtMetricValue(c.semantic, c.numeric.median)}`,
      `n = ${formatNumber(c.count - c.missing)}`,
    ];
    if (context && context.removed > 0 && money) {
      evidenceParts.push(
        `outlier-aware total excluding ${formatNumber(context.removed)} IQR outlier(s) = ${fmtMetricValue(c.semantic, context.filteredSum)}`
      );
    }
    insights.push(
      makeInsight({
        idPrefix: "find",
        title: `${humanizeRole(c.semantic)} Baseline`,
        type: "finding",
        severity: outlierRatePct >= 5 ? "medium" : "high",
        confidence: insightConfidence({
          values: dataset.rows
            .map((row) => toNumber(row[c.name] ?? null))
            .filter((v): v is number => v !== null),
          outlierRatePct,
          missingPct: c.missingPct,
          anomalyPct,
        }),
        what_happened: `${humanizeRole(c.semantic)} totaled ${fmtMetricValue(c.semantic, c.numeric.sum)} in the uploaded data.`,
        evidence: evidenceParts.join("; ") + ".",
        what_contributed:
          context && context.removed > 0
            ? "The raw total includes unusually large or small records flagged by the IQR method."
            : "The total is the direct sum of non-missing numeric records in this column.",
        requires_investigation: context ? context.removed > 0 : false,
        potential_explanations:
          context && context.removed > 0
            ? ["Outliers may be legitimate major transactions, duplicate records, or data-entry errors."]
            : [],
        why_it_matters:
          "Totals are useful for board reporting, but medians and outlier-aware totals help prevent one record from dominating the story.",
        recommended_action:
          context && context.removed > 0
            ? `Review the ${formatNumber(context.removed)} outlier record(s) before presenting ${c.name} as a headline total.`
            : "Use this figure with the stated record count and median for context.",
        metric: `sum_${c.name}`,
        value: c.numeric.sum,
        column: c.name,
      })
    );
  }

  for (const t of trends.slice(0, 6)) {
    const classified = classifyTrend(t);
    const forecast = forecasts.find((f) => f.metric === t.metric);
    const values = t.series.map((p) => p.value);
    const confidence = insightConfidence({
      consistency: classified.consistency,
      values,
      outlierRatePct: outlierRateFor(t.metric, profile, outliers),
      missingPct: missingPctFor(t.metric, profile),
      anomalyPct,
      forecastR2: forecast?.r2,
    });
    const medianGrowth = medianPeriodGrowthPct(t.series);

    if (classified.classification === "trend") {
      insights.push(
        makeInsight({
          idPrefix: "trend",
          title: `${t.metric} Structural Trend`,
          type: "trend",
          severity: Math.abs(t.totalGrowthPct) >= 20 ? "high" : "medium",
          confidence,
          what_happened: `${t.metric} ${trendSentence(t)} across ${t.series.length} ${t.granularity}s with ${Math.round(classified.consistency * 100)}% directional consistency.`,
          evidence: `First period = ${formatCompact(t.first)}; last period = ${formatCompact(t.last)}; total change = ${formatPercentRaw(t.totalGrowthPct)}; median period change = ${formatPercentRaw(medianGrowth)}; slope = ${t.slope.toFixed(2)}/period.`,
          what_contributed:
            "This classification is based on repeated period-to-period movement in the same direction, not only first-versus-last change.",
          requires_investigation: true,
          potential_explanations: [
            "Program cadence, seasonality, campaign timing, or reporting practices may explain the pattern.",
          ],
          why_it_matters:
            "A consistent trend is more decision-useful than a single-period change because it is less likely to be one isolated event.",
          recommended_action:
            t.direction === "down"
              ? `Review the periods after ${t.peak.period} to determine whether the decline reflects operations, seasonality, or data capture.`
              : `Use the trend as planning context, and document what happened operationally during the period before setting targets.`,
          metric: `trend_${t.metric}`,
          value: `${t.totalGrowthPct.toFixed(1)}%`,
          column: t.metric,
        })
      );
    } else if (classified.classification === "event") {
      const eventPoint = classified.eventPoints[0] ?? t.peak;
      insights.push(
        makeInsight({
          idPrefix: "event",
          title: `${t.metric} Notable Event`,
          type: "event",
          severity: "medium",
          confidence,
          what_happened: `${t.metric} had a one-period movement in ${eventPoint.period} (${formatCompact(eventPoint.value)}) that stands apart from the rest of the series.`,
          evidence: `Total change = ${formatPercentRaw(t.totalGrowthPct)}; median period change = ${formatPercentRaw(medianGrowth)}; event-like periods flagged = ${classified.eventPoints.length}.`,
          what_contributed:
            "The series does not show enough multi-period consistency to call this a structural trend.",
          requires_investigation: true,
          potential_explanations: [
            "This may reflect a campaign, grant receipt, bulk data entry, seasonality, or an unusual operating event.",
          ],
          why_it_matters:
            "Treating one-off events as trends can overstate the reliability of future expectations.",
          recommended_action:
            `Annotate ${eventPoint.period} with known organizational context before using it in board discussion or forecasts.`,
          metric: `event_${t.metric}`,
          value: eventPoint.value,
          column: t.metric,
        })
      );
    }
  }

  if (profile.qualityScore.overall < 100 || profile.qualityScore.issues.length > 0) {
    insights.push(
      makeInsight({
        idPrefix: "risk",
        title: "Data Quality Risk",
        type: "risk",
        severity: severityFromScore(profile.qualityScore.overall),
        confidence: profile.qualityScore.issues.length > 0 ? "high" : "medium",
        what_happened: `Data quality is ${profile.qualityScore.overall}/100 (grade ${profile.qualityScore.grade}).`,
        evidence: `Completeness ${profile.qualityScore.components.completeness}%, uniqueness ${profile.qualityScore.components.uniqueness}%, consistency ${profile.qualityScore.components.consistency}%, validity ${profile.qualityScore.components.validity}%; ${profile.qualityScore.issues.length} issue(s) flagged.`,
        what_contributed:
          "The score reflects missingness, duplicates, type consistency, category consistency, and validity checks.",
        requires_investigation: profile.qualityScore.issues.length > 0,
        potential_explanations:
          profile.qualityScore.issues.length > 0
            ? ["Issues may come from source-system exports, manual entry, or inconsistent category naming."]
            : [],
        why_it_matters:
          "Board-ready reporting should separate program performance from data-quality limitations.",
        recommended_action:
          "Resolve high- and medium-severity data-quality issues before publishing final figures.",
        metric: "quality_score",
        value: profile.qualityScore.overall,
      })
    );
  }

  if (profile.totalMissingPct > 0) {
    const worst = profile.columns
      .filter((c) => c.missingPct > 0)
      .sort((a, b) => b.missingPct - a.missingPct)[0];
    insights.push(
      makeInsight({
        idPrefix: "risk",
        title: "Missing Data",
        type: "risk",
        severity: profile.totalMissingPct >= 10 ? "high" : "medium",
        confidence: "high",
        what_happened: `${formatPercentRaw(profile.totalMissingPct)} of cells are missing${worst ? `, with the highest rate in ${worst.name}` : ""}.`,
        evidence: `Missing cells = ${formatNumber(profile.totalMissing)} of ${formatNumber(profile.rowCount * profile.columnCount)}${worst ? `; ${worst.name} missing = ${formatPercentRaw(worst.missingPct)}` : ""}.`,
        what_contributed:
          "This is computed from blank/null cells in the uploaded file.",
        requires_investigation: true,
        potential_explanations: [
          "Missing values may reflect optional fields, incomplete collection, or export limitations.",
        ],
        why_it_matters:
          "Missingness can understate totals and lower confidence in comparisons across groups or periods.",
        recommended_action:
          worst ? `Decide whether ${worst.name} should be backfilled, excluded, or clearly footnoted.` : "Document the missing-data policy.",
        metric: "missing_pct",
        value: `${profile.totalMissingPct.toFixed(1)}%`,
        column: worst?.name,
      })
    );
  }

  for (const o of outliers.filter((x) => x.iqrOutliers > 0).slice(0, 3)) {
    const outlierRatePct = outlierRateFor(o.column, profile, outliers);
    insights.push(
      makeInsight({
        idPrefix: "risk",
        title: `${o.column} Outlier Review`,
        type: "risk",
        severity: outlierRatePct >= 5 ? "high" : "medium",
        confidence: "high",
        what_happened: `${o.column} has ${formatNumber(o.iqrOutliers)} value(s) outside the IQR range.`,
        evidence: `Expected range = [${formatCompact(o.lowerBound)}, ${formatCompact(o.upperBound)}]; IQR outliers = ${formatNumber(o.iqrOutliers)}; z-score outliers = ${formatNumber(o.zScoreOutliers)}.`,
        what_contributed:
          "The flag comes from the distribution of values in the uploaded column.",
        requires_investigation: true,
        potential_explanations: [
          "Records may be valid exceptional cases, duplicate entries, or data-entry errors.",
        ],
        why_it_matters:
          "Outliers can materially affect averages, totals, benchmarks, and forecast fit.",
        recommended_action:
          "Review flagged records and present raw plus outlier-aware context when the values are valid but unusual.",
        metric: `outliers_${o.column}`,
        value: o.iqrOutliers,
        column: o.column,
      })
    );
  }

  const reliablePositiveTrend = trends.find((t) => {
    const c = classifyTrend(t);
    return c.classification === "trend" && t.direction === "up" && c.consistency >= 0.65;
  });
  if (reliablePositiveTrend) {
    insights.push(
      makeInsight({
        idPrefix: "opp",
        title: "Planning Opportunity",
        type: "opportunity",
        severity: "medium",
        confidence: insightConfidence({
          consistency: trendConsistency(reliablePositiveTrend),
          values: reliablePositiveTrend.series.map((p) => p.value),
          outlierRatePct: outlierRateFor(reliablePositiveTrend.metric, profile, outliers),
          missingPct: missingPctFor(reliablePositiveTrend.metric, profile),
          anomalyPct,
          forecastR2: forecasts.find((f) => f.metric === reliablePositiveTrend.metric)?.r2,
        }),
        what_happened: `${reliablePositiveTrend.metric} shows repeated upward movement across the observed periods.`,
        evidence: `Total change = ${formatPercentRaw(reliablePositiveTrend.totalGrowthPct)}; median period change = ${formatPercentRaw(medianPeriodGrowthPct(reliablePositiveTrend.series))}; directional consistency = ${Math.round(trendConsistency(reliablePositiveTrend) * 100)}%.`,
        what_contributed:
          "The opportunity is based on observed consistency, not a proven cause.",
        requires_investigation: true,
        potential_explanations: [
          "Operational improvements, outreach cadence, or seasonality may be associated with the pattern.",
        ],
        why_it_matters:
          "Consistent positive movement can support conservative planning assumptions when paired with context.",
        recommended_action:
          "Use this as a discussion point for goals, but attach operational notes before making commitments.",
        metric: `opportunity_${reliablePositiveTrend.metric}`,
        value: `${reliablePositiveTrend.totalGrowthPct.toFixed(1)}%`,
        column: reliablePositiveTrend.metric,
      })
    );
  }

  for (const f of forecasts.slice(0, 3)) {
    const last = f.forecast[f.forecast.length - 1];
    if (!last) continue;
    insights.push(
      makeInsight({
        idPrefix: "rec",
        title: `${f.metric} Forecast Use`,
        type: "recommendation",
        severity: f.r2 < 0.4 ? "medium" : "low",
        confidence: insightConfidence({
          values: f.history.map((p) => p.value),
          forecastR2: f.r2,
          missingPct: missingPctFor(f.metric, profile),
          outlierRatePct: outlierRateFor(f.metric, profile, outliers),
          anomalyPct,
        }),
        what_happened: `${f.metric} has a ${f.method} forecast through ${last.period}.`,
        evidence: `Projected value = ${formatCompact(last.value)}; ${(f.confidenceLevel * 100).toFixed(0)}% interval = ${formatCompact(last.lower)} to ${formatCompact(last.upper)}; R² = ${f.r2.toFixed(2)}.`,
        what_contributed:
          "Forecast confidence reflects historical variance, outliers, missingness, anomaly rate, and linear fit.",
        requires_investigation: f.r2 < 0.6,
        potential_explanations:
          f.r2 < 0.6 ? ["Low fit may indicate seasonality, one-time events, or nonlinear behavior."] : [],
        why_it_matters:
          "Forecasts are planning aids, not guarantees; the interval is more board-ready than a single point estimate.",
        recommended_action:
          "Use the forecast interval for scenario planning and footnote the method and confidence level.",
        metric: `forecast_${f.metric}`,
        value: last.value,
        column: f.metric,
      })
    );
  }

  insights.push(
    makeInsight({
      idPrefix: "rec",
      title: "Board-Ready Framing",
      type: "recommendation",
      severity: "medium",
      confidence: "high",
      what_happened:
        "The analysis can support a board summary if findings are paired with confidence and method notes.",
      evidence: `${insights.length} computed insight(s), ${profile.qualityScore.issues.length} quality issue(s), ${trends.length} tracked time-series metric(s), and ${forecasts.length} forecast(s) are available.`,
      what_contributed:
        "This recommendation synthesizes computed diagnostics; it does not add external benchmarks.",
      requires_investigation: false,
      why_it_matters:
        "Decision-makers need to know what changed, how confident the analysis is, and which points require follow-up.",
      recommended_action:
        "Present the Executive Summary with the Confidence / Method Notes section attached.",
      metric: "recommendation",
      value: "board_ready_framing",
    })
  );

  return insights;
}

export function bundleInsights(insights: Insight[]): InsightBundle {
  const byCategory: Record<InsightCategory, Insight[]> = {
    finding: [],
    trend: [],
    event: [],
    risk: [],
    opportunity: [],
    recommendation: [],
  };
  for (const ins of insights) byCategory[ins.category].push(ins);
  const order = { high: 0, medium: 1, low: 2 };
  (Object.keys(byCategory) as InsightCategory[]).forEach((k) =>
    byCategory[k].sort((a, b) => order[a.severity] - order[b.severity])
  );
  return {
    generatedAt: new Date().toISOString(),
    grounded: true,
    insights,
    byCategory,
  };
}
