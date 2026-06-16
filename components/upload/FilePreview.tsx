"use client";

import type { ParsedDataset } from "@/types/dataset";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { truncate } from "@/lib/utils";

export function FilePreview({ dataset, maxRows = 8 }: { dataset: ParsedDataset; maxRows?: number }) {
  const rows = dataset.rows.slice(0, maxRows);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Preview</span>
          <Badge variant="secondary" className="tabular-nums">
            {dataset.rows.length.toLocaleString()} rows
          </Badge>
          <Badge variant="secondary" className="tabular-nums">
            {dataset.headers.length} columns
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          Showing first {Math.min(maxRows, dataset.rows.length)} rows
        </span>
      </div>

      <div className="app-scroll max-h-[360px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {dataset.headers.map((h) => (
                <TableHead key={h} className="whitespace-nowrap">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {dataset.headers.map((h) => {
                  const v = row[h];
                  const isNum = typeof v === "number";
                  return (
                    <TableCell
                      key={h}
                      className={
                        isNum
                          ? "whitespace-nowrap tabular-nums"
                          : "whitespace-nowrap"
                      }
                    >
                      {v === null ? (
                        <span className="text-muted-foreground/50">—</span>
                      ) : (
                        truncate(String(v), 32)
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
