import type { AnalysisResult, Insight } from "@/types/dataset";
import { formatCompact, formatNumber, formatPercentRaw } from "@/lib/utils";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function codeColumnNames(text: string, columns: string[]): string {
  let out = text;
  for (const column of [...columns].sort((a, b) => b.length - a.length)) {
    if (!column) continue;
    const pattern = new RegExp(`(?<![\`\\w])${escapeRegExp(column)}(?![\`\\w])`, "g");
    out = out.replace(pattern, `\`${column}\``);
  }
  return out;
}

function insightLines(insights: Insight[], columns: string[]): string {
  if (insights.length === 0) return "_No items in this section._\n";
  return insights
    .map((i) => {
      const explanations = (i.potential_explanations ?? []).length
        ? `\n  - Potential explanation: ${codeColumnNames((i.potential_explanations ?? []).join(" "), columns)}`
        : "";
      return (
        `- **${codeColumnNames(i.title, columns)}** (${i.severity} severity, ${i.confidence} confidence)\n` +
        `  - What happened: ${codeColumnNames(i.what_happened, columns)}\n` +
        `  - Evidence: ${codeColumnNames(i.evidence, columns)}\n` +
        `  - What contributed: ${codeColumnNames(i.what_contributed, columns)}${explanations}\n` +
        `  - Requires investigation: ${i.requires_investigation ? "yes" : "no"}\n` +
        `  - Why it matters: ${codeColumnNames(i.why_it_matters, columns)}\n` +
        `  - Recommended action: ${codeColumnNames(i.recommended_action, columns)}`
      );
    })
    .join("\n");
}

function section(lines: string[], title: string): void {
  lines.push(`## ${title}`);
  lines.push("");
}

function addInsightSection(
  lines: string[],
  title: string,
  insights: Insight[],
  columns: string[]
): void {
  section(lines, title);
  lines.push(insightLines(insights, columns));
  lines.push("");
}

/** Build a complete, board-ready Impact Report as Markdown. */
export function buildMarkdownReport(result: AnalysisResult): string {
  const { profile } = result;
  const date = new Date(result.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lines: string[] = [];
  const columns = profile.columns.map((column) => column.name);
  lines.push(`# Impact Report`);
  lines.push("");
  lines.push(`**Dataset:** ${result.fileName}  `);
  lines.push(`**Generated:** ${date}  `);
  lines.push(`**Records analyzed:** ${formatNumber(result.rowCount)} rows × ${result.columnCount} fields`);
  lines.push("");
  lines.push(`> Board-ready analytics from uploaded data only. — Datanaid`);
  lines.push("");

  section(lines, "Executive Summary");
  const topFindings = result.insights.byCategory.finding.slice(0, 3);
  topFindings.forEach((f) => lines.push(`- ${codeColumnNames(f.what_happened, columns)}`));
  lines.push(
    `- Overall data quality: **${profile.qualityScore.overall}/100 (grade ${profile.qualityScore.grade})**.`
  );
  const topRisk = result.insights.byCategory.risk[0];
  if (topRisk) {
    lines.push(
      `- Main risk to note: ${codeColumnNames(topRisk.what_happened, columns)} (${topRisk.confidence} confidence).`
    );
  }
  lines.push("");

  section(lines, "What Happened");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | ---: |`);
  for (const k of result.kpis) {
    lines.push(`| ${codeColumnNames(k.label, columns)} | ${k.value} |`);
  }
  lines.push("");
  lines.push(insightLines(result.insights.byCategory.finding ?? [], columns));
  lines.push("");

  addInsightSection(lines, "Key Trends", result.insights.byCategory.trend ?? [], columns);
  addInsightSection(lines, "Notable Events", result.insights.byCategory.event ?? [], columns);
  addInsightSection(lines, "Risks", result.insights.byCategory.risk ?? [], columns);
  addInsightSection(lines, "Opportunities", result.insights.byCategory.opportunity ?? [], columns);

  section(lines, "Forecasts");
  if (result.forecasts.length) {
    for (const f of result.forecasts.slice(0, 3)) {
      const last = f.forecast[f.forecast.length - 1];
      if (!last) continue;
      lines.push(
        `- **${codeColumnNames(f.metric, columns)}** projected to ${formatCompact(last.value)} by ${last.period} (` +
          `${(f.confidenceLevel * 100).toFixed(0)}% interval: ${formatCompact(last.lower)} to ${formatCompact(last.upper)}; R²=${f.r2.toFixed(2)}).`
      );
    }
  } else {
    lines.push("_No forecast available._");
  }
  lines.push("");

  addInsightSection(lines, "Recommendations", result.insights.byCategory.recommendation ?? [], columns);

  section(lines, "Confidence / Method Notes");
  const confidenceCounts = result.insights.insights.reduce<Record<string, number>>((acc, insight) => {
    acc[insight.confidence] = (acc[insight.confidence] ?? 0) + 1;
    return acc;
  }, {});
  lines.push(
    `- Confidence counts: high ${confidenceCounts.high ?? 0}, medium ${confidenceCounts.medium ?? 0}, low ${confidenceCounts.low ?? 0}.`
  );
  lines.push(
    `- Confidence uses trend consistency, variance, anomaly count, missingness, outlier rates, and forecast fit where available.`
  );
  lines.push(
    `- One-period anomalies are classified as events unless the series shows multi-period consistency.`
  );
  lines.push(`- Missing cells: ${formatNumber(profile.totalMissing)} (${formatPercentRaw(profile.totalMissingPct)}).`);
  lines.push(`- Duplicate rows: ${formatNumber(profile.duplicateRows)} (${formatPercentRaw(profile.duplicatePct)}).`);
  if (result.anomalies) {
    lines.push(
      `- Multivariate anomalies: ${formatNumber(result.anomalies.anomalyCount)} record(s) flagged (${formatPercentRaw(result.anomalies.anomalyPct)}).`
    );
  }
  lines.push("");
  lines.push(`---`);
  lines.push("");
  lines.push(
    `_Every figure in this report is computed directly from your uploaded data. Datanaid does not invent statistics or causal explanations._`
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
