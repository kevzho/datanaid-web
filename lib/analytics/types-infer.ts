import type { CellValue, ColumnType, SemanticRole, DataRow } from "@/types/dataset";
import { toNumber } from "./stats";

const DATE_PATTERNS = [
  /^\d{4}-\d{1,2}-\d{1,2}([ T]\d{1,2}:\d{2}(:\d{2})?)?$/, // ISO
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // US/EU slash
  /^\d{1,2}-\d{1,2}-\d{2,4}$/,
  /^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}$/, // Jan 5, 2024
  /^\d{4}\/\d{1,2}\/\d{1,2}$/,
  /^\d{4}-Q[1-4]$/i,
  /^\d{4}-W\d{1,2}$/i,
];

const BOOL_TOKENS = new Set(["true", "false", "yes", "no", "y", "n", "t", "f", "1", "0"]);

export function looksLikeDate(v: CellValue): boolean {
  if (v === null) return false;
  if (typeof v === "object" && Object.prototype.toString.call(v) === "[object Date]") return true;
  const s = String(v).trim();
  if (s.length < 4) return false;
  if (DATE_PATTERNS.some((p) => p.test(s))) {
    const t = Date.parse(s);
    return !Number.isNaN(t);
  }
  return false;
}

function looksLikeBool(v: CellValue): boolean {
  if (typeof v === "boolean") return true;
  if (v === null) return false;
  return BOOL_TOKENS.has(String(v).trim().toLowerCase());
}

/**
 * Infer the column type from a sample of values.
 * Priority: datetime > boolean > numeric > categorical/text.
 */
export function inferColumnType(values: CellValue[]): ColumnType {
  const nonNull = values.filter((v) => v !== null);
  if (nonNull.length === 0) return "text";

  const sample = nonNull.slice(0, 500);
  const n = sample.length;

  const dateHits = sample.filter(looksLikeDate).length;
  if (dateHits / n >= 0.85) return "datetime";

  const boolHits = sample.filter(looksLikeBool).length;
  const distinctBoolish = new Set(
    sample.map((v) => String(v).trim().toLowerCase())
  );
  if (boolHits / n >= 0.95 && distinctBoolish.size <= 3) return "boolean";

  const numHits = sample.filter((v) => toNumber(v) !== null).length;
  if (numHits / n >= 0.9) {
    // Guard: numeric-looking IDs with all-unique integers are still numeric,
    // but very low-cardinality integer codes read better as categorical.
    return "numeric";
  }

  // Categorical vs free text: cardinality heuristic.
  const distinct = new Set(sample.map((v) => String(v)));
  const ratio = distinct.size / n;
  if (distinct.size <= 50 || ratio < 0.5) return "categorical";
  return "text";
}

/** Count values that conflict with the declared type (for data-quality checks). */
export function countTypeConflicts(values: CellValue[], type: ColumnType): {
  conflicts: number;
  examples: CellValue[];
} {
  const examples: CellValue[] = [];
  let conflicts = 0;
  for (const v of values) {
    if (v === null) continue;
    let ok = true;
    switch (type) {
      case "numeric":
        ok = toNumber(v) !== null;
        break;
      case "datetime":
        ok = looksLikeDate(v);
        break;
      case "boolean":
        ok = looksLikeBool(v);
        break;
      default:
        ok = true;
    }
    if (!ok) {
      conflicts++;
      if (examples.length < 5) examples.push(v);
    }
  }
  return { conflicts, examples };
}

/** Parse a datetime cell to epoch ms, or null. */
export function parseDate(v: CellValue): number | null {
  if (v === null) return null;
  if (typeof v === "object" && Object.prototype.toString.call(v) === "[object Date]") {
    return (v as unknown as Date).getTime();
  }
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? null : t;
}

/* ── Nonprofit semantic detection ─────────────────────────────
   Maps column names (and a light content check) to nonprofit roles. */

const SEMANTIC_KEYWORDS: Record<SemanticRole, RegExp> = {
  donations: /\b(donat|gift|contribut|pledge|giving)\b/i,
  volunteers: /\b(volunteer|vol_hours|volunteer_hours)\b/i,
  clients_served: /\b(client|served|served_count|cases|recipients_served)\b/i,
  attendance: /\b(attend|turnout|present|rsvp|headcount|participants?)\b/i,
  revenue: /\b(revenue|income|earned|proceeds|receipts)\b/i,
  expenses: /\b(expense|cost|spend|expenditure|outlay)\b/i,
  programs: /\b(program|initiative|service|project_name)\b/i,
  beneficiaries: /\b(benefic|impacted|reached|people_helped|individuals)\b/i,
  grant_funding: /\b(grant|funding|funder|award|foundation)\b/i,
  date: /\b(date|month|year|quarter|period|day|timestamp|when)\b/i,
  location: /\b(location|city|state|region|zip|county|site|branch|address)\b/i,
  category: /\b(category|type|segment|class|group|tier)\b/i,
  unknown: /$^/,
};

export function detectSemanticRole(
  columnName: string,
  type: ColumnType
): SemanticRole {
  const roleOrder: SemanticRole[] = [
    "donations",
    "grant_funding",
    "revenue",
    "expenses",
    "volunteers",
    "attendance",
    "clients_served",
    "beneficiaries",
    "programs",
    "location",
    "category",
    "date",
  ];
  for (const role of roleOrder) {
    if (SEMANTIC_KEYWORDS[role].test(columnName)) {
      // Sanity: monetary/count roles should be numeric; date role datetime.
      if (role === "date" && type !== "datetime" && type !== "categorical") continue;
      return role;
    }
  }
  return "unknown";
}

export function getColumnValues(rows: DataRow[], column: string): CellValue[] {
  return rows.map((r) => r[column] ?? null);
}
