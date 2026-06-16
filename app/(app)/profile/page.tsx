"use client";

import * as React from "react";
import Link from "next/link";
import {
  Database,
  Columns3,
  CircleSlash,
  CopyX,
  Hash,
  Type,
  CalendarRange,
  ToggleLeft,
  FileText,
  UploadCloud,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageSection } from "@/components/shared/PageSection";
import { DataQualityCard } from "@/components/dashboard/DataQualityCard";
import { DistributionChartCard } from "@/components/charts/DistributionChart";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAnalysis } from "@/lib/store/analysis-store";
import { formatNumber, formatPercentRaw } from "@/lib/utils";
import type { ColumnType } from "@/types/dataset";

const TYPE_META: Record<
  ColumnType,
  { label: string; icon: typeof Hash; className: string }
> = {
  numeric: { label: "Numeric", icon: Hash, className: "text-chart-1" },
  categorical: { label: "Categorical", icon: Type, className: "text-chart-2" },
  datetime: { label: "Datetime", icon: CalendarRange, className: "text-chart-3" },
  boolean: { label: "Boolean", icon: ToggleLeft, className: "text-chart-4" },
  text: { label: "Text", icon: FileText, className: "text-chart-5" },
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold tabular-nums">{value}</p>
          {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const { result } = useAnalysis();

  if (!result) {
    return (
      <DashboardShell
        title="Data Profile"
        description="Column types, completeness, and per-field statistics."
      >
        <EmptyState
          icon={UploadCloud}
          title="No dataset analyzed yet"
          description="Upload a CSV or Excel file to see a full profile of every column in your data."
          actionLabel="Upload a dataset"
          actionHref="/upload"
        />
      </DashboardShell>
    );
  }

  const { profile } = result;
  const typeCounts = {
    numeric: profile.numericColumns.length,
    categorical: profile.categoricalColumns.length,
    datetime: profile.datetimeColumns.length,
  };
  const numericProfiles = profile.columns.filter((c) => c.numeric).slice(0, 4);

  return (
    <DashboardShell
      title="Data Profile"
      description={`${result.fileName} — ${formatNumber(profile.rowCount)} rows × ${profile.columnCount} columns`}
      actions={
        <Link
          href="/analysis"
          className="text-sm font-medium text-primary hover:underline"
        >
          View deeper analysis →
        </Link>
      }
    >
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={Database}
            label="Rows"
            value={formatNumber(profile.rowCount)}
            sub={`~${formatNumber(profile.memoryEstimateKb)} KB`}
          />
          <StatCard
            icon={Columns3}
            label="Columns"
            value={String(profile.columnCount)}
            sub={`${typeCounts.numeric} numeric · ${typeCounts.categorical} categorical · ${typeCounts.datetime} date`}
          />
          <StatCard
            icon={CircleSlash}
            label="Missing cells"
            value={formatNumber(profile.totalMissing)}
            sub={`${formatPercentRaw(profile.totalMissingPct)} of all cells`}
          />
          <StatCard
            icon={CopyX}
            label="Duplicate rows"
            value={formatNumber(profile.duplicateRows)}
            sub={`${formatPercentRaw(profile.duplicatePct)} of rows`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <PageSection
            title="Column profiles"
            description="Type, completeness, and uniqueness for every field."
          >
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Column</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Missing</TableHead>
                        <TableHead className="text-right">Unique</TableHead>
                        <TableHead>Summary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.columns.map((col) => {
                        const meta = TYPE_META[col.type];
                        const Icon = meta.icon;
                        let summary = "—";
                        if (col.numeric) {
                          summary = `μ ${formatNumber(col.numeric.mean)} · med ${formatNumber(col.numeric.median)}`;
                        } else if (col.categorical) {
                          summary = `top: ${col.categorical.mode} (${formatNumber(col.categorical.modeFreq)})`;
                        } else if (col.datetime) {
                          summary = `${col.datetime.min} → ${col.datetime.max}`;
                        }
                        return (
                          <TableRow key={col.name}>
                            <TableCell className="font-medium">
                              <span className="flex items-center gap-1.5">
                                {col.name}
                                {col.semantic && col.semantic !== "unknown" && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {col.semantic.replace(/_/g, " ")}
                                  </Badge>
                                )}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1.5 text-sm">
                                <Icon className={`h-3.5 w-3.5 ${meta.className}`} />
                                {meta.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              <span
                                className={
                                  col.missingPct > 10
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                }
                              >
                                {formatPercentRaw(col.missingPct)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {formatNumber(col.unique)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {summary}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </PageSection>

          <PageSection
            title="Data quality"
            description="Completeness, uniqueness, consistency, and validity."
          >
            <DataQualityCard score={profile.qualityScore} />
          </PageSection>
        </div>

        {numericProfiles.length > 0 && (
          <PageSection
            title="Numeric distributions"
            description="How values spread across your key numeric columns."
          >
            <div className="grid gap-6 md:grid-cols-2">
              {numericProfiles.map((col) => (
                <DistributionChartCard key={col.name} column={col} />
              ))}
            </div>
          </PageSection>
        )}
      </div>
    </DashboardShell>
  );
}
