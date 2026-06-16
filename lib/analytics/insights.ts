import type {
  AnalysisResult,
  DatasetProfile,
  Insight,
  InsightBundle,
  InsightCategory,
  OutlierReport,
  ParsedDataset,
  TrendAnalysis,
} from "@/types/dataset";
import { formatCompact, formatCurrency, formatNumber, formatPercentRaw } from "@/lib/utils";

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

const MONEY = new Set(["donations", "revenue", "expenses", "grant_funding"]);

function fmtMetricValue(role: string | undefined, value: number): string {
  return role && MONEY.has(role) ? formatCurrency(value) : formatCompact(value);
}

/**
 * DETERMINISTIC insight generation.
 * Every insight is computed directly from statistics — no model involved.
 * This is the no-hallucination core. The optional LLM layer may only rephrase
 * the `finding`/`recommended_action` prose; it can never introduce a number.
 */
export function generateGroundedInsights(
  dataset: ParsedDataset,
  profile: DatasetProfile,
  trends: TrendAnalysis[],
  outliers: OutlierReport[]
): Insight[] {
  counter = 0;
  const insights: Insight[] = [];
  const domains = profile.detectedDomains.filter((d) => d !== "unknown");

  /* ── FINDINGS: dataset composition & headline magnitudes ── */
  insights.push({
    id: id("find"),
    category: "finding",
    finding: `The dataset contains ${formatNumber(profile.rowCount)} records across ${profile.columnCount} fields, with ${profile.numericColumns.length} numeric, ${profile.categoricalColumns.length} categorical, and ${profile.datetimeColumns.length} date column(s).`,
    evidence: `Row count = ${formatNumber(profile.rowCount)}; column count = ${profile.columnCount}; computed during profiling.`,
    importance: "medium",
    recommended_action:
      "Confirm the record granularity (one row per donation, per beneficiary, per event) before interpreting totals.",
    metric: "row_count",
    value: profile.rowCount,
  });

  if (domains.length > 0) {
    insights.push({
      id: id("find"),
      category: "finding",
      finding: `Datanaid auto-detected nonprofit signals in this data: ${domains.map(humanizeRole).join(", ")}. Reporting is tuned to these domains.`,
      evidence: `Semantic detection matched column names/content to roles: ${domains.join(", ")}.`,
      importance: "low",
      recommended_action:
        "Use the Impact Report to translate these metrics into a funder-ready narrative.",
      metric: "detected_domains",
      value: domains.join(", "),
    });
  }

  // Headline totals for each semantic numeric column
  for (const c of profile.columns) {
    if (c.type === "numeric" && c.numeric && c.semantic && c.semantic !== "unknown") {
      insights.push({
        id: id("find"),
        category: "finding",
        finding: `${humanizeRole(c.semantic)} total ${fmtMetricValue(c.semantic, c.numeric.sum)} across the dataset, averaging ${fmtMetricValue(c.semantic, c.numeric.mean)} per record.`,
        evidence: `Sum(${c.name}) = ${fmtMetricValue(c.semantic, c.numeric.sum)}; mean = ${fmtMetricValue(c.semantic, c.numeric.mean)}; n = ${formatNumber(c.count - c.missing)}.`,
        importance: "high",
        recommended_action:
          "Feature this total in your impact summary and compare it against your annual goal.",
        metric: `sum_${c.name}`,
        value: c.numeric.sum,
        column: c.name,
      });
    }
  }

  /* ── TRENDS ── */
  for (const t of trends.slice(0, 4)) {
    const dirWord = t.direction === "up" ? "increased" : t.direction === "down" ? "decreased" : "held roughly flat";
    insights.push({
      id: id("trend"),
      category: "trend",
      finding: `${t.metric} ${dirWord} ${formatPercentRaw(Math.abs(t.totalGrowthPct))} over the observed period (${t.series.length} ${t.granularity}s), from ${formatCompact(t.first)} to ${formatCompact(t.last)}.`,
      evidence: `First period = ${formatCompact(t.first)}; last period = ${formatCompact(t.last)}; total change = ${formatPercentRaw(t.totalGrowthPct)}; trend slope = ${t.slope.toFixed(2)}/period.`,
      importance: Math.abs(t.totalGrowthPct) >= 15 ? "high" : "medium",
      recommended_action:
        t.direction === "down"
          ? `Investigate what changed around ${t.trough.period} (the low point at ${formatCompact(t.trough.value)}) and whether it is seasonal or structural.`
          : `Sustain the drivers behind this growth and set a target above the recent peak of ${formatCompact(t.peak.value)} (${t.peak.period}).`,
      metric: `growth_${t.metric}`,
      value: `${t.totalGrowthPct.toFixed(1)}%`,
      column: t.metric,
    });
  }

  /* ── RISKS: quality + outliers ── */
  if (profile.qualityScore.overall < 80) {
    insights.push({
      id: id("risk"),
      category: "risk",
      finding: `Data quality is ${profile.qualityScore.overall}/100 (grade ${profile.qualityScore.grade}), which can undermine confidence in reported figures.`,
      evidence: `Completeness ${profile.qualityScore.components.completeness}%, uniqueness ${profile.qualityScore.components.uniqueness}%, consistency ${profile.qualityScore.components.consistency}%, validity ${profile.qualityScore.components.validity}%.`,
      importance: profile.qualityScore.overall < 60 ? "high" : "medium",
      recommended_action:
        "Resolve the high-severity issues on the Analysis page before publishing this report externally.",
      metric: "quality_score",
      value: profile.qualityScore.overall,
    });
  }

  if (profile.totalMissingPct >= 5) {
    const worst = profile.columns.filter((c) => c.missingPct > 0).sort((a, b) => b.missingPct - a.missingPct)[0];
    insights.push({
      id: id("risk"),
      category: "risk",
      finding: `${formatPercentRaw(profile.totalMissingPct)} of all cells are missing${worst ? `, concentrated in ${worst.name} (${formatPercentRaw(worst.missingPct)} blank)` : ""}.`,
      evidence: `Total missing cells = ${formatNumber(profile.totalMissing)} of ${formatNumber(profile.rowCount * profile.columnCount)}.`,
      importance: profile.totalMissingPct >= 20 ? "high" : "medium",
      recommended_action: worst
        ? `Backfill or exclude ${worst.name}; metrics derived from it may understate true totals.`
        : "Decide on an imputation or exclusion policy for blanks and document it.",
      metric: "missing_pct",
      value: `${profile.totalMissingPct.toFixed(1)}%`,
      column: worst?.name,
    });
  }

  if (profile.duplicatePct >= 1) {
    insights.push({
      id: id("risk"),
      category: "risk",
      finding: `${formatPercentRaw(profile.duplicatePct)} of rows are exact duplicates, which can inflate counts and totals.`,
      evidence: `Duplicate rows = ${formatNumber(profile.duplicateRows)} of ${formatNumber(profile.rowCount)}.`,
      importance: profile.duplicatePct >= 5 ? "high" : "medium",
      recommended_action: "De-duplicate before reporting to avoid double-counting impact.",
      metric: "duplicate_pct",
      value: `${profile.duplicatePct.toFixed(1)}%`,
    });
  }

  for (const o of outliers.slice(0, 2)) {
    const total = o.iqrOutliers;
    if (total === 0) continue;
    insights.push({
      id: id("risk"),
      category: "risk",
      finding: `${o.column} has ${formatNumber(o.iqrOutliers)} statistical outlier(s) outside the expected range [${formatCompact(o.lowerBound)}, ${formatCompact(o.upperBound)}].`,
      evidence: `IQR method flagged ${o.iqrOutliers}; Z-score (>3σ) flagged ${o.zScoreOutliers}.`,
      importance: "medium",
      recommended_action:
        "Review these records — they may be data-entry errors, or genuinely exceptional cases worth highlighting.",
      metric: `outliers_${o.column}`,
      value: o.iqrOutliers,
      column: o.column,
    });
  }

  /* ── OPPORTUNITIES ── */
  // Concentration: a single category dominating suggests a dependency or a lever.
  for (const t of trends.slice(0, 2)) {
    if (t.direction === "up" && t.totalGrowthPct >= 10) {
      insights.push({
        id: id("opp"),
        category: "opportunity",
        finding: `${t.metric} is on a clear upward trajectory (+${t.totalGrowthPct.toFixed(1)}%), suggesting momentum worth scaling.`,
        evidence: `Average period-over-period growth = ${formatPercentRaw(t.avgPeriodGrowthPct)}; positive slope = ${t.slope.toFixed(2)}.`,
        importance: "high",
        recommended_action: `Double down on whatever drove ${t.metric} growth and reflect the trajectory in your forecast and fundraising asks.`,
        metric: `opportunity_${t.metric}`,
        value: `${t.totalGrowthPct.toFixed(1)}%`,
        column: t.metric,
      });
    }
  }

  /* ── RECOMMENDATIONS (synthesized, still grounded) ── */
  const recs: string[] = [];
  if (profile.qualityScore.overall >= 80) {
    recs.push(
      `Your data is reporting-ready (quality ${profile.qualityScore.overall}/100). Generate the Impact Report and share it with funders.`
    );
  }
  if (profile.datetimeColumns.length > 0 && trends.length > 0) {
    recs.push(
      `Use the forecast on the Visualizations page to project ${trends[0].metric} forward and set a defensible next-period target.`
    );
  }
  if (domains.includes("donations") || domains.includes("revenue")) {
    recs.push(
      "Pair revenue/donation trends with program outcomes to build a cost-per-outcome story that resonates with grantmakers."
    );
  }
  recs.forEach((r) =>
    insights.push({
      id: id("rec"),
      category: "recommendation",
      finding: r,
      evidence: "Derived from the computed quality score, detected domains, and trend analysis above.",
      importance: "medium",
      recommended_action: r,
      metric: "recommendation",
      value: "synthesized",
    })
  );

  return insights;
}

function humanizeRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function bundleInsights(insights: Insight[]): InsightBundle {
  const byCategory: Record<InsightCategory, Insight[]> = {
    finding: [],
    trend: [],
    risk: [],
    opportunity: [],
    recommendation: [],
  };
  for (const ins of insights) byCategory[ins.category].push(ins);
  // Sort each by importance.
  const order = { high: 0, medium: 1, low: 2 };
  (Object.keys(byCategory) as InsightCategory[]).forEach((k) =>
    byCategory[k].sort((a, b) => order[a.importance] - order[b.importance])
  );
  return {
    generatedAt: new Date().toISOString(),
    grounded: true,
    insights,
    byCategory,
  };
}
