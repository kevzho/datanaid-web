import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { CellValue, DataRow, ParsedDataset } from "@/types/dataset";

export const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"] as const;
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_ROWS = 100_000;

export interface IngestResult {
  ok: boolean;
  dataset?: ParsedDataset;
  error?: string;
  warnings: string[];
}

/** Normalize a raw parsed cell into our CellValue union. */
function coerceCell(raw: unknown): CellValue {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "boolean") return raw;
  const s = String(raw).trim();
  if (s === "") return null;
  // Common null sentinels
  const lowered = s.toLowerCase();
  if (["na", "n/a", "null", "none", "nan", "-", "--"].includes(lowered)) {
    return null;
  }
  return s;
}

function normalizeRows(rawRows: Record<string, unknown>[], headers: string[]): DataRow[] {
  return rawRows.map((r) => {
    const row: DataRow = {};
    for (const h of headers) {
      row[h] = coerceCell(r[h]);
    }
    return row;
  });
}

/** Detect file extension from a filename. */
export function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx === -1 ? "" : fileName.slice(idx).toLowerCase();
}

export function isAcceptedFile(fileName: string): boolean {
  return (ACCEPTED_EXTENSIONS as readonly string[]).includes(getExtension(fileName));
}

/** Parse CSV text into a dataset. */
export function parseCsv(text: string, fileName: string): IngestResult {
  const warnings: string[] = [];
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    const critical = result.errors.filter((e) => e.type === "Delimiter" || e.type === "Quotes");
    if (critical.length > 0 && result.data.length === 0) {
      return { ok: false, error: critical[0].message, warnings };
    }
    warnings.push(`${result.errors.length} parse warning(s) encountered; rows were recovered where possible.`);
  }

  const headers = (result.meta.fields ?? []).map((h) => h.trim()).filter(Boolean);
  if (headers.length === 0) {
    return { ok: false, error: "No columns detected. Make sure the first row contains headers.", warnings };
  }

  let rows = normalizeRows(result.data, headers);
  if (rows.length > MAX_ROWS) {
    warnings.push(`Dataset truncated to the first ${MAX_ROWS.toLocaleString()} rows for analysis.`);
    rows = rows.slice(0, MAX_ROWS);
  }

  if (rows.length === 0) {
    return { ok: false, error: "No data rows found below the header.", warnings };
  }

  return { ok: true, dataset: { fileName, headers, rows }, warnings };
}

/** Parse an XLSX/XLS ArrayBuffer into a dataset (first sheet). */
export function parseExcel(buffer: ArrayBuffer, fileName: string): IngestResult {
  const warnings: string[] = [];
  try {
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return { ok: false, error: "Workbook contains no sheets.", warnings };
    }
    if (wb.SheetNames.length > 1) {
      warnings.push(`Workbook has ${wb.SheetNames.length} sheets; analyzing the first ("${sheetName}").`);
    }
    const sheet = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: true,
    });
    if (json.length === 0) {
      return { ok: false, error: "The first sheet has no data rows.", warnings };
    }
    const headers = Object.keys(json[0]).map((h) => h.trim()).filter(Boolean);
    let rows = normalizeRows(json, headers);
    if (rows.length > MAX_ROWS) {
      warnings.push(`Dataset truncated to the first ${MAX_ROWS.toLocaleString()} rows for analysis.`);
      rows = rows.slice(0, MAX_ROWS);
    }
    return { ok: true, dataset: { fileName, headers, rows }, warnings };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to read the spreadsheet.",
      warnings,
    };
  }
}

/** Unified browser-side entry point: dispatch on file type. */
export async function ingestFile(file: File): Promise<IngestResult> {
  if (!isAcceptedFile(file.name)) {
    return {
      ok: false,
      error: `Unsupported file type. Please upload a ${ACCEPTED_EXTENSIONS.join(", ")} file.`,
      warnings: [],
    };
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_FILE_BYTES / 1024 / 1024} MB.`,
      warnings: [],
    };
  }
  const ext = getExtension(file.name);
  if (ext === ".csv") {
    const text = await file.text();
    return parseCsv(text, file.name);
  }
  const buffer = await file.arrayBuffer();
  return parseExcel(buffer, file.name);
}
