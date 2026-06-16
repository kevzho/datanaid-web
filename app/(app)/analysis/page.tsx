"use client";

import * as React from "react";
import {
  CircleSlash,
  CopyX,
  TriangleAlert,
  ShieldQuestion,
  Microscope,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageSection } from "@/components/shared/PageSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAnalysis } from "@/lib/store/analysis-store";
import { formatNumber, formatPercentRaw, formatCompact } from "@/lib/utils";

function SectionEmpty({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

export default function AnalysisPage() {
  const { result } = useAnalysis();

  if (!result) {
    return (
      <DashboardShell
        title="Analysis"
        description="Missing values, duplicates, outliers, and type issues."
      >
        <EmptyState
          icon={Microscope}
          title="Nothing to analyze yet"
          description="Upload a dataset and we'll surface data quality issues — missing values, duplicates, and outliers — automatically."
          actionLabel="Upload a dataset"
          actionHref="/upload"
        />
      </DashboardShell>
    );
  }

  const { missing, duplicates, outliers, typeIssues } = result;
  const missingCols = missing.byColumn.filter((c) => c.missing > 0);

  return (
    <DashboardShell
      title="Analysis"
      description={`Data quality checks for ${result.fileName}.`}
    >
      <div className="space-y-8">
        {/* Missing values */}
        <PageSection
          title="Missing values"
          description={`${formatNumber(missing.totalMissing)} missing cells across ${formatNumber(missing.totalCells)} total${missing.worstColumn ? ` — worst: ${missing.worstColumn}` : ""}.`}
        >
          {missingCols.length === 0 ? (
            <SectionEmpty message="No missing values detected. Your dataset is complete." />
          ) : (
            <Card>
              <CardContent className="space-y-3 p-5">
                {missingCols.map((c) => (
                  <div key={c.column} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <CircleSlash className="h-3.5 w-3.5 text-muted-foreground" />
                        {c.column}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatNumber(c.missing)} ({formatPercentRaw(c.missingPct)})
                      </span>
                    </div>
                    <Progress value={Math.min(c.missingPct, 100)} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </PageSection>

        {/* Duplicates */}
        <PageSection
          title="Duplicate rows"
          description="Exact duplicate records that may inflate your totals."
        >
          {duplicates.duplicateRows === 0 ? (
            <SectionEmpty message="No duplicate rows found. Every record is unique." />
          ) : (
            <Card>
              <CardContent className="flex flex-wrap items-center gap-6 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-warning/15 text-warning">
                    <CopyX className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatNumber(duplicates.duplicateRows)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      duplicate rows ({formatPercentRaw(duplicates.duplicatePct)} of data)
                    </p>
                  </div>
                </div>
                {duplicates.exampleIndices.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Example row indices:{" "}
                    <span className="font-mono text-foreground">
                      {duplicates.exampleIndices.slice(0, 8).join(", ")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </PageSection>

        {/* Outliers */}
        <PageSection
          title="Outliers"
          description="Detected with both the IQR (1.5×) rule and the Z-score (>3σ) method."
        >
          {outliers.length === 0 ? (
            <SectionEmpty message="No significant outliers detected in numeric columns." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Column</TableHead>
                        <TableHead className="text-right">IQR outliers</TableHead>
                        <TableHead className="text-right">Z-score outliers</TableHead>
                        <TableHead>Expected range (IQR)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outliers.map((o) => (
                        <TableRow key={o.column}>
                          <TableCell className="font-medium">
                            <span className="flex items-center gap-2">
                              <TriangleAlert className="h-3.5 w-3.5 text-warning" />
                              {o.column}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatNumber(o.iqrOutliers)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatNumber(o.zScoreOutliers)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            [{formatCompact(o.lowerBound)}, {formatCompact(o.upperBound)}]
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </PageSection>

        {/* Type issues */}
        <PageSection
          title="Type consistency"
          description="Columns where some values don't match the inferred type."
        >
          {typeIssues.length === 0 ? (
            <SectionEmpty message="All columns are type-consistent. No mixed-type fields detected." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {typeIssues.map((t) => (
                <Card key={t.column}>
                  <CardContent className="space-y-2 p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-medium">
                        <ShieldQuestion className="h-4 w-4 text-warning" />
                        {t.column}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {t.declaredType}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatNumber(t.conflictingCount)} value
                      {t.conflictingCount === 1 ? "" : "s"} conflict with the inferred type.
                    </p>
                    {t.examples.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Examples:{" "}
                        <span className="font-mono text-foreground">
                          {t.examples
                            .slice(0, 4)
                            .map((e) => String(e))
                            .join(", ")}
                        </span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </PageSection>
      </div>
    </DashboardShell>
  );
}
