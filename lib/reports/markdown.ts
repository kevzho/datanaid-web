import type { AnalysisResult, Insight, InsightCategory } from "@/types/dataset";
import { formatCompact, formatNumber, formatPercentRaw } from "@/lib/utils";

const CATEGORY_TITLES: Record<InsightCategory, string> = {
  finding: "Key Findings",
  trend: "Trends",
  risk: "Risks",
  opportunity: "Opportunities",
  recommendation: "Recommendations",
};

function insightLines(insights: Insight[]): string {
  if (insights.length === 0) return "_No items in this category._\n";
  return insights
    .map(
      (i) =>
        `- **${i.finding}**\n  - Evidence: ${i.evidence}\n  - Recommended action: ${i.recommended_action}\n  - Importance: ${i.importance}`
    )
    .join("\n");
}

/** Build a complete, funder-ready Impact Report as Markdown. */
export function buildMarkdownReport(result: AnalysisResult): string {
  const { profile } = result;
  const date = new Date(result.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lines: string[] = [];
  lines.push(`# Impact Report`);
  lines.push("");
  lines.push(`**Dataset:** ${result.fileName}  `);
  lines.push(`**Generated:** ${date}  `);
  lines.push(`**Records analyzed:** ${formatNumber(result.rowCount)} rows × ${result.columnCount} fields`);
  lines.push("");
  lines.push(`> Turn nonprofit data into impact. — Datanaid`);
  lines.push("");

  // Executive summary
  lines.push(`## Executive Summary`);
  lines.push("");
  const topFindings = result.insights.byCategory.finding.slice(0, 3);
  if (topFindings.length) {
    topFindings.forEach((f) => lines.push(`- ${f.finding}`));
  }
  lines.push(
    `- Overall data quality: **${profile.qualityScore.overall}/100 (grade ${profile.qualityScore.grade})**.`
  );
  if (result.trends.length) {
    const t = result.trends[0];
    lines.push(
      `- ${t.metric} ${t.direction === "up" ? "increased" : t.direction === "down" ? "decreased" : "held flat"} ${formatPercentRaw(Math.abs(t.totalGrowthPct))} over ${t.series.length} ${t.granularity}s.`
    );
  }
  lines.push("");

  // Key metrics
  lines.push(`## Key Metrics`);
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | ---: |`);
  for (const k of result.kpis) {
    lines.push(`| ${k.label} | ${k.value} |`);
  }
  lines.push("");

  // Trends
  if (result.trends.length) {
    lines.push(`## Trends`);
    lines.push("");
    for (const t of result.trends.slice(0, 5)) {
      lines.push(
        `- **${t.metric}** (${t.granularity}): ${formatCompact(t.first)} → ${formatCompact(t.last)} (${t.totalGrowthPct >= 0 ? "+" : ""}${t.totalGrowthPct.toFixed(1)}%). Peak ${formatCompact(t.peak.value)} in ${t.peak.period}.`
      );
    }
    lines.push("");
  }

  // Forecasts
  if (result.forecasts.length) {
    lines.push(`## Forecast`);
    lines.push("");
    for (const f of result.forecasts.slice(0, 3)) {
      const last = f.forecast[f.forecast.length - 1];
      if (!last) continue;
      lines.push(
        `- **${f.metric}** projected to ${formatCompact(last.value)} by ${last.period} (${(f.confidenceLevel * 100).toFixed(0)}% CI: ${formatCompact(last.lower)}–${formatCompact(last.upper)}; R²=${f.r2.toFixed(2)}).`
      );
    }
    lines.push("");
  }

  // Anomalies / data issues
  lines.push(`## Data Quality & Anomalies`);
  lines.push("");
  lines.push(`- Missing cells: ${formatNumber(profile.totalMissing)} (${formatPercentRaw(profile.totalMissingPct)}).`);
  lines.push(`- Duplicate rows: ${formatNumber(profile.duplicateRows)} (${formatPercentRaw(profile.duplicatePct)}).`);
  if (result.anomalies) {
    lines.push(
      `- Multivariate anomalies: ${formatNumber(result.anomalies.anomalyCount)} record(s) flagged (${formatPercentRaw(result.anomalies.anomalyPct)}).`
    );
  }
  const topIssues = profile.qualityScore.issues.slice(0, 5);
  if (topIssues.length) {
    lines.push("");
    lines.push(`Top issues:`);
    topIssues.forEach((iss) => lines.push(`- [${iss.severity}] ${iss.message}`));
  }
  lines.push("");

  // Insights by category
  (["finding", "trend", "risk", "opportunity", "recommendation"] as InsightCategory[]).forEach(
    (cat) => {
      lines.push(`## ${CATEGORY_TITLES[cat]}`);
      lines.push("");
      lines.push(insightLines(result.insights.byCategory[cat]));
      lines.push("");
    }
  );

  lines.push(`---`);
  lines.push("");
  lines.push(
    `_Every figure in this report is computed directly from your uploaded data. Datanaid does not invent statistics._`
  );

  return lines.join("\n");
}

export function downloadMarkdown(result: AnalysisResult): void {
  const md = buildMarkdownReport(result);
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${result.fileName.replace(/\.[^.]+$/, "")}-impact-report.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
