import type {
  CategoricalStats,
  ColumnProfile,
  ColumnType,
  DataRow,
  DatasetProfile,
  DatetimeStats,
  NumericStats,
  ParsedDataset,
  QualityIssue,
  QualityScore,
  SemanticRole,
  ValueCount,
} from "@/types/dataset";
import {
  fiveNumberSummary,
  histogram,
  mean,
  median,
  numericValues,
  std,
} from "./stats";
import {
  detectSemanticRole,
  getColumnValues,
  inferColumnType,
  parseDate,
} from "./types-infer";

function profileNumeric(values: number[]): NumericStats {
  const five = fiveNumberSummary(values);
  const m = mean(values);
  return {
    min: five.min,
    max: five.max,
    mean: m,
    median: median(values),
    std: std(values, m),
    q1: five.q1,
    q3: five.q3,
    iqr: five.iqr,
    sum: values.reduce((a, b) => a + b, 0),
    zeros: values.filter((v) => v === 0).length,
    negatives: values.filter((v) => v < 0).length,
    histogram: histogram(values),
  };
}

function profileCategorical(values: (string | number | boolean)[]): CategoricalStats {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = String(v);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = values.length;
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const topValues: ValueCount[] = sorted.slice(0, 12).map(([value, count]) => ({
    value,
    count,
    pct: total ? (count / total) * 100 : 0,
  }));
  return {
    topValues,
    mode: sorted[0]?.[0] ?? "",
    modeFreq: sorted[0]?.[1] ?? 0,
  };
}

function profileDatetime(values: (string | number | boolean)[]): DatetimeStats {
  const epochs = values
    .map((v) => parseDate(v))
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b);
  if (epochs.length === 0) {
    return { min: "", max: "", rangeDays: 0, granularity: "irregular" };
  }
  const minMs = epochs[0];
  const maxMs = epochs[epochs.length - 1];
  const rangeDays = Math.round((maxMs - minMs) / 86_400_000);

  // Median gap → granularity.
  const gaps: number[] = [];
  for (let i = 1; i < epochs.length; i++) {
    const g = epochs[i] - epochs[i - 1];
    if (g > 0) gaps.push(g);
  }
  const medianGapDays = gaps.length ? median(gaps) / 86_400_000 : 0;
  let granularity: DatetimeStats["granularity"] = "irregular";
  if (medianGapDays <= 1.5) granularity = "day";
  else if (medianGapDays <= 9) granularity = "week";
  else if (medianGapDays <= 45) granularity = "month";
  else if (medianGapDays <= 135) granularity = "quarter";
  else if (medianGapDays <= 400) granularity = "year";

  return {
    min: new Date(minMs).toISOString().slice(0, 10),
    max: new Date(maxMs).toISOString().slice(0, 10),
    rangeDays,
    granularity,
  };
}

export function profileColumn(rows: DataRow[], name: string): ColumnProfile {
  const values = getColumnValues(rows, name);
  const count = values.length;
  const nonNull = values.filter((v) => v !== null) as (string | number | boolean)[];
  const missing = count - nonNull.length;
  const uniqueSet = new Set(nonNull.map((v) => String(v)));
  const type: ColumnType = inferColumnType(values);
  const semantic: SemanticRole = detectSemanticRole(name, type);

  const profile: ColumnProfile = {
    name,
    type,
    semantic: semantic === "unknown" ? undefined : semantic,
    count,
    missing,
    missingPct: count ? (missing / count) * 100 : 0,
    unique: uniqueSet.size,
    uniquePct: nonNull.length ? (uniqueSet.size / nonNull.length) * 100 : 0,
    sampleValues: nonNull.slice(0, 5),
  };

  if (type === "numeric") {
    const nums = numericValues(values);
    if (nums.length > 0) profile.numeric = profileNumeric(nums);
  } else if (type === "datetime") {
    profile.datetime = profileDatetime(nonNull);
  } else {
    profile.categorical = profileCategorical(nonNull);
  }
  return profile;
}

function hashRow(row: DataRow, headers: string[]): string {
  return headers.map((h) => String(row[h] ?? "")).join("\u0001");
}

export function countDuplicates(rows: DataRow[], headers: string[]): number {
  const seen = new Set<string>();
  let dups = 0;
  for (const row of rows) {
    const key = hashRow(row, headers);
    if (seen.has(key)) dups++;
    else seen.add(key);
  }
  return dups;
}

function gradeFor(score: number): QualityScore["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function buildQualityScore(
  columns: ColumnProfile[],
  totalMissingPct: number,
  duplicatePct: number,
  rows: DataRow[]
): QualityScore {
  const issues: QualityIssue[] = [];

  // Completeness
  const completeness = Math.max(0, 100 - totalMissingPct);
  for (const c of columns) {
    if (c.missingPct >= 5) {
      issues.push({
        severity: c.missingPct >= 30 ? "high" : c.missingPct >= 15 ? "medium" : "low",
        column: c.name,
        type: "missing_values",
        message: `${c.name} is ${c.missingPct.toFixed(1)}% missing (${c.missing.toLocaleString()} blank values).`,
        affected: c.missing,
      });
    }
    // Constant column
    if (c.unique <= 1 && c.count > 1) {
      issues.push({
        severity: "low",
        column: c.name,
        type: "constant_column",
        message: `${c.name} has only one distinct value and adds no analytical signal.`,
        affected: c.count,
      });
    }
    // High cardinality categorical
    if (c.type === "categorical" && c.uniquePct > 95 && c.unique > 50) {
      issues.push({
        severity: "low",
        column: c.name,
        type: "high_cardinality",
        message: `${c.name} is nearly all unique (${c.unique.toLocaleString()} distinct) — likely an identifier, not a category.`,
        affected: c.unique,
      });
    }
  }

  // Uniqueness (rows)
  const uniqueness = Math.max(0, 100 - duplicatePct);
  if (duplicatePct >= 1) {
    issues.push({
      severity: duplicatePct >= 10 ? "high" : duplicatePct >= 3 ? "medium" : "low",
      type: "duplicate_rows",
      message: `${duplicatePct.toFixed(1)}% of rows are exact duplicates.`,
      affected: Math.round((duplicatePct / 100) * rows.length),
    });
  }

  // Consistency: penalize columns we couldn't confidently type as text fallback
  const textCols = columns.filter((c) => c.type === "text").length;
  const consistency = Math.max(60, 100 - (textCols / Math.max(1, columns.length)) * 40);

  // Validity: numeric columns with extreme negatives where unexpected, etc. (light)
  let validityPenalty = 0;
  for (const c of columns) {
    if (c.numeric && c.semantic && ["donations", "revenue", "attendance", "volunteers", "clients_served", "beneficiaries"].includes(c.semantic) && c.numeric.negatives > 0) {
      validityPenalty += 5;
      issues.push({
        severity: "medium",
        column: c.name,
        type: "outliers",
        message: `${c.name} contains ${c.numeric.negatives} negative value(s), which is unexpected for ${c.semantic.replace("_", " ")}.`,
        affected: c.numeric.negatives,
      });
    }
  }
  const validity = Math.max(0, 100 - validityPenalty);

  const overall = Math.round(
    completeness * 0.4 + uniqueness * 0.25 + consistency * 0.2 + validity * 0.15
  );

  issues.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  return {
    overall,
    grade: gradeFor(overall),
    components: {
      completeness: Math.round(completeness),
      uniqueness: Math.round(uniqueness),
      consistency: Math.round(consistency),
      validity: Math.round(validity),
    },
    issues,
  };
}

export function profileDataset(dataset: ParsedDataset): DatasetProfile {
  const { rows, headers, fileName } = dataset;
  const columns = headers.map((h) => profileColumn(rows, h));

  const totalCells = rows.length * headers.length;
  const totalMissing = columns.reduce((acc, c) => acc + c.missing, 0);
  const totalMissingPct = totalCells ? (totalMissing / totalCells) * 100 : 0;

  const duplicateRows = countDuplicates(rows, headers);
  const duplicatePct = rows.length ? (duplicateRows / rows.length) * 100 : 0;

  const numericColumns = columns.filter((c) => c.type === "numeric").map((c) => c.name);
  const categoricalColumns = columns
    .filter((c) => c.type === "categorical" || c.type === "boolean")
    .map((c) => c.name);
  const datetimeColumns = columns.filter((c) => c.type === "datetime").map((c) => c.name);

  const detectedDomains = Array.from(
    new Set(columns.map((c) => c.semantic).filter((s): s is SemanticRole => !!s && s !== "unknown"))
  );

  const qualityScore = buildQualityScore(columns, totalMissingPct, duplicatePct, rows);

  // Rough memory estimate
  const memoryEstimateKb = Math.round((totalCells * 16) / 1024);

  return {
    fileName,
    rowCount: rows.length,
    columnCount: headers.length,
    columns,
    totalMissing,
    totalMissingPct,
    duplicateRows,
    duplicatePct,
    numericColumns,
    categoricalColumns,
    datetimeColumns,
    memoryEstimateKb,
    qualityScore,
    detectedDomains,
  };
}
