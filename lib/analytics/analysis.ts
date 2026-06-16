import type {
  DataRow,
  DatasetProfile,
  DuplicateReport,
  MissingValueReport,
  OutlierReport,
  ParsedDataset,
  TypeIssueReport,
} from "@/types/dataset";
import { fiveNumberSummary, mean, numericValues, std } from "./stats";
import { countTypeConflicts, getColumnValues } from "./types-infer";

export function analyzeMissing(dataset: ParsedDataset, profile: DatasetProfile): MissingValueReport {
  const byColumn = profile.columns
    .map((c) => ({ column: c.name, missing: c.missing, missingPct: c.missingPct }))
    .sort((a, b) => b.missing - a.missing);
  const totalCells = dataset.rows.length * dataset.headers.length;
  const worst = byColumn.find((c) => c.missing > 0);
  return {
    byColumn,
    totalMissing: profile.totalMissing,
    totalCells,
    worstColumn: worst?.column,
  };
}

export function analyzeDuplicates(dataset: ParsedDataset, profile: DatasetProfile): DuplicateReport {
  const seen = new Map<string, number>();
  const exampleIndices: number[] = [];
  dataset.rows.forEach((row, i) => {
    const key = dataset.headers.map((h) => String(row[h] ?? "")).join("\u0001");
    if (seen.has(key)) {
      if (exampleIndices.length < 10) exampleIndices.push(i);
    } else {
      seen.set(key, i);
    }
  });
  return {
    duplicateRows: profile.duplicateRows,
    duplicatePct: profile.duplicatePct,
    exampleIndices,
  };
}

/** IQR + Z-score outliers for every numeric column. */
export function analyzeOutliers(dataset: ParsedDataset, profile: DatasetProfile): OutlierReport[] {
  const reports: OutlierReport[] = [];
  for (const col of profile.numericColumns) {
    const raw = getColumnValues(dataset.rows, col);
    const nums = numericValues(raw);
    if (nums.length < 8) continue;

    const { q1, q3, iqr } = fiveNumberSummary(nums);
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const m = mean(nums);
    const s = std(nums, m);

    let iqrCount = 0;
    let zCount = 0;
    const examples: OutlierReport["examples"] = [];

    dataset.rows.forEach((row, idx) => {
      const v = row[col];
      const n = typeof v === "number" ? v : v === null ? null : Number(String(v).replace(/[$,%\s]/g, ""));
      if (n === null || !Number.isFinite(n as number)) return;
      const num = n as number;
      const isIqr = num < lowerBound || num > upperBound;
      const z = s === 0 ? 0 : Math.abs((num - m) / s);
      const isZ = z > 3;
      if (isIqr) iqrCount++;
      if (isZ) zCount++;
      if ((isIqr || isZ) && examples.length < 8) {
        examples.push({ index: idx, value: num, method: isIqr ? "iqr" : "zscore" });
      }
    });

    if (iqrCount > 0 || zCount > 0) {
      reports.push({
        column: col,
        iqrOutliers: iqrCount,
        zScoreOutliers: zCount,
        lowerBound,
        upperBound,
        examples,
      });
    }
  }
  return reports.sort((a, b) => b.iqrOutliers - a.iqrOutliers);
}

/** Values that conflict with the inferred column type. */
export function analyzeTypeIssues(dataset: ParsedDataset, profile: DatasetProfile): TypeIssueReport[] {
  const reports: TypeIssueReport[] = [];
  for (const c of profile.columns) {
    if (c.type === "text" || c.type === "categorical") continue;
    const values = getColumnValues(dataset.rows, c.name);
    const { conflicts, examples } = countTypeConflicts(values, c.type);
    if (conflicts > 0) {
      reports.push({
        column: c.name,
        declaredType: c.type,
        conflictingCount: conflicts,
        examples,
      });
    }
  }
  return reports.sort((a, b) => b.conflictingCount - a.conflictingCount);
}

export function getRow(dataset: ParsedDataset, index: number): DataRow | undefined {
  return dataset.rows[index];
}
