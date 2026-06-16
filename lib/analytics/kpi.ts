import type {
  DatasetProfile,
  KPI,
  ParsedDataset,
  SemanticRole,
  TrendAnalysis,
} from "@/types/dataset";
import { formatCompact, formatCurrency, formatNumber } from "@/lib/utils";

const MONETARY_ROLES: SemanticRole[] = ["donations", "revenue", "expenses", "grant_funding"];

const ROLE_LABELS: Record<SemanticRole, string> = {
  donations: "Total Donations",
  volunteers: "Volunteers",
  clients_served: "Clients Served",
  attendance: "Total Attendance",
  revenue: "Total Revenue",
  expenses: "Total Expenses",
  programs: "Programs",
  beneficiaries: "Beneficiaries Reached",
  grant_funding: "Grant Funding",
  date: "Date Range",
  location: "Locations",
  category: "Categories",
  unknown: "Value",
};

/**
 * Build the headline KPI strip. Prioritizes nonprofit semantic metrics,
 * falls back to dataset-shape and quality KPIs. Caps at 6 cards.
 */
export function buildKPIs(
  dataset: ParsedDataset,
  profile: DatasetProfile,
  trends: TrendAnalysis[]
): KPI[] {
  const kpis: KPI[] = [];
  const trendByMetric = new Map(trends.map((t) => [t.metric, t]));

  // 1) Semantic numeric totals
  const semanticNumeric = profile.columns.filter(
    (c) => c.type === "numeric" && c.semantic && c.numeric && c.semantic !== "unknown"
  );

  for (const c of semanticNumeric) {
    const role = c.semantic as SemanticRole;
    const isMoney = MONETARY_ROLES.includes(role);
    const sum = c.numeric!.sum;
    const trend = trendByMetric.get(c.name);
    kpis.push({
      label: ROLE_LABELS[role] ?? c.name,
      value: isMoney ? formatCurrency(sum) : formatCompact(sum),
      rawValue: sum,
      delta: trend ? trend.totalGrowthPct : undefined,
      deltaLabel: trend ? "vs. start of period" : undefined,
      direction: trend?.direction,
      semantic: role,
      hint: `Sum of ${c.name} across ${formatNumber(c.count - c.missing)} records`,
    });
    if (kpis.length >= 4) break;
  }

  // 2) Always include dataset shape + quality
  kpis.push({
    label: "Records",
    value: formatNumber(profile.rowCount),
    rawValue: profile.rowCount,
    hint: `${profile.columnCount} columns analyzed`,
  });

  kpis.push({
    label: "Data Quality",
    value: `${profile.qualityScore.overall}/100`,
    rawValue: profile.qualityScore.overall,
    direction:
      profile.qualityScore.overall >= 80
        ? "up"
        : profile.qualityScore.overall >= 60
          ? "flat"
          : "down",
    hint: `Grade ${profile.qualityScore.grade} · ${profile.qualityScore.issues.length} issue(s) flagged`,
  });

  // 3) If we still have room and there is a clear top trend, surface growth.
  if (kpis.length < 6 && trends.length > 0) {
    const top = trends[0];
    kpis.push({
      label: `${top.metric} Growth`,
      value: `${top.totalGrowthPct >= 0 ? "+" : ""}${top.totalGrowthPct.toFixed(1)}%`,
      rawValue: top.totalGrowthPct,
      direction: top.direction,
      deltaLabel: `over ${top.series.length} ${top.granularity}s`,
      hint: `${top.metric} moved from ${formatCompact(top.first)} to ${formatCompact(top.last)}`,
    });
  }

  return kpis.slice(0, 6);
}
