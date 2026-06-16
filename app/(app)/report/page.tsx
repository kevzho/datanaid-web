"use client";

import * as React from "react";
import {
  FileText,
  Download,
  Printer,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { KPISection } from "@/components/dashboard/KPISection";
import { TrendChartCard } from "@/components/charts/TrendChart";
import { ForecastChartCard } from "@/components/charts/ForecastChart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAnalysis } from "@/lib/store/analysis-store";
import { downloadMarkdown } from "@/lib/reports/markdown";
import { printReport } from "@/lib/reports/print";
import { formatCompact, formatNumber, formatPercentRaw } from "@/lib/utils";
import type { AnalysisResult } from "@/types/dataset";

/* ── Export toolbar ─────────────────────────────────────────── */

function ExportTools({ result }: { result: AnalysisResult }) {
  const { toast } = useToast();

  return (
    <div className="no-print flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          downloadMarkdown(result);
          toast({
            title: "Markdown downloaded",
            description: "Your Impact Report is ready to share.",
            variant: "success",
          });
        }}
      >
        <Download className="mr-1.5 h-4 w-4" />
        Download Markdown
      </Button>
      <Button size="sm" onClick={() => printReport()}>
        <Printer className="mr-1.5 h-4 w-4" />
        Print / Save PDF
      </Button>
    </div>
  );
}

/* ── Report building blocks ─────────────────────────────────── */

function ReportHeader({ result }: { result: AnalysisResult }) {
  const date = new Date(result.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-3 border-b border-border pb-6">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
        <FileText className="h-3.5 w-3.5" />
        Impact Report
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {result.fileName.replace(/\.[^.]+$/, "")}
      </h1>
      <p className="text-sm text-muted-foreground">
        Generated {date} · {formatNumber(result.rowCount)} rows ×{" "}
        {result.columnCount} fields analyzed
      </p>
      <p className="text-sm italic text-muted-foreground">
        Turn nonprofit data into impact. — Datanaid
      </p>
    </div>
  );
}

function ExecutiveSummary({ result }: { result: AnalysisResult }) {
  const { profile } = result;
  const topFindings = result.insights.byCategory.finding.slice(0, 3);
  const trend = result.trends[0];

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Executive summary</h2>
      <Card>
        <CardContent className="space-y-3 p-6 text-sm leading-relaxed text-muted-foreground">
          <ul className="space-y-2">
            {topFindings.map((f) => (
              <li key={f.id} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-foreground">{f.finding}</span>
              </li>
            ))}
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                Overall data quality is{" "}
                <span className="font-medium text-foreground">
                  {profile.qualityScore.overall}/100 (grade{" "}
                  {profile.qualityScore.grade})
                </span>
                .
              </span>
            </li>
            {trend ? (
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  {trend.metric}{" "}
                  {trend.direction === "up"
                    ? "increased"
                    : trend.direction === "down"
                    ? "decreased"
                    : "held flat"}{" "}
                  {formatPercentRaw(Math.abs(trend.totalGrowthPct))} across{" "}
                  {trend.series.length} {trend.granularity}s.
                </span>
              </li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

function KeyMetrics({ result }: { result: AnalysisResult }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Key metrics</h2>
      <KPISection kpis={result.kpis} />
    </section>
  );
}

function TrendDirectionIcon({ direction }: { direction: "up" | "down" | "flat" }) {
  if (direction === "up") return <TrendingUp className="h-4 w-4 text-success" />;
  if (direction === "down")
    return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function TrendsSection({ result }: { result: AnalysisResult }) {
  if (result.trends.length === 0) return null;
  const primary = result.trends[0];
  const rest = result.trends.slice(1, 5);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Trends over time</h2>
      <TrendChartCard trend={primary} />
      {rest.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Other tracked metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rest.map((t) => (
              <div
                key={t.metric}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <TrendDirectionIcon direction={t.direction} />
                  {t.metric}
                </span>
                <span className="text-muted-foreground">
                  {formatCompact(t.first)} → {formatCompact(t.last)} (
                  {t.totalGrowthPct >= 0 ? "+" : ""}
                  {t.totalGrowthPct.toFixed(1)}%)
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function ForecastSection({ result }: { result: AnalysisResult }) {
  if (result.forecasts.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Forecast</h2>
      <ForecastChartCard forecast={result.forecasts[0]} />
    </section>
  );
}

function AnomaliesSection({ result }: { result: AnalysisResult }) {
  const { profile } = result;
  const topIssues = profile.qualityScore.issues.slice(0, 5);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Data quality &amp; anomalies
      </h2>
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Missing cells</p>
              <p className="text-lg font-semibold text-foreground">
                {formatNumber(profile.totalMissing)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({formatPercentRaw(profile.totalMissingPct)})
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duplicate rows</p>
              <p className="text-lg font-semibold text-foreground">
                {formatNumber(profile.duplicateRows)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({formatPercentRaw(profile.duplicatePct)})
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Multivariate anomalies
              </p>
              <p className="text-lg font-semibold text-foreground">
                {result.anomalies
                  ? formatNumber(result.anomalies.anomalyCount)
                  : "—"}{" "}
                {result.anomalies ? (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({formatPercentRaw(result.anomalies.anomalyPct)})
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          {topIssues.length > 0 ? (
            <>
              <Separator />
              <div className="space-y-2">
                {topIssues.map((iss, idx) => (
                  <div
                    key={`${iss.type}-${idx}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    <AlertTriangle
                      className={
                        iss.severity === "high"
                          ? "mt-0.5 h-4 w-4 shrink-0 text-destructive"
                          : iss.severity === "medium"
                          ? "mt-0.5 h-4 w-4 shrink-0 text-warning"
                          : "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                      }
                    />
                    <span className="text-muted-foreground">
                      <Badge
                        variant="outline"
                        className="mr-2 text-[10px] uppercase"
                      >
                        {iss.severity}
                      </Badge>
                      {iss.message}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function RecommendationsSection({ result }: { result: AnalysisResult }) {
  const recs = result.insights.byCategory.recommendation;
  if (recs.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Recommended actions
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {recs.map((r, idx) => (
          <Card key={r.id}>
            <CardContent className="flex gap-3 p-5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {idx + 1}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {r.recommended_action}
                </p>
                <p className="text-xs text-muted-foreground">{r.evidence}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ── Page ───────────────────────────────────────────────────── */

export default function ReportPage() {
  const { result } = useAnalysis();

  if (!result) {
    return (
      <DashboardShell
        title="Impact Report"
        description="A funder-ready summary of your data story."
      >
        <EmptyState
          icon={FileText}
          title="No report yet"
          description="Upload a dataset and Datanaid will compile a complete, shareable Impact Report — executive summary, key metrics, trends, and grounded recommendations."
          actionLabel="Upload a dataset"
          actionHref="/upload"
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Impact Report"
      description="From spreadsheets to stories — ready to share with funders and your board."
      actions={<ExportTools result={result} />}
    >
      <div id="report-content" className="mx-auto max-w-4xl space-y-10">
        <ReportHeader result={result} />

        <div className="no-print flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <p className="text-sm text-muted-foreground">
            Every figure in this report is computed directly from your uploaded
            data. Datanaid does not invent statistics.
          </p>
        </div>

        <ExecutiveSummary result={result} />
        <KeyMetrics result={result} />
        <TrendsSection result={result} />
        <ForecastSection result={result} />
        <AnomaliesSection result={result} />
        <RecommendationsSection result={result} />

        <Separator />
        <div className="flex items-center gap-2 pb-6 text-xs text-muted-foreground">
          <Lightbulb className="h-3.5 w-3.5 text-primary" />
          Compiled by Datanaid · {result.insights.insights.length} grounded
          insights · Quality {result.profile.qualityScore.overall}/100
        </div>
      </div>
    </DashboardShell>
  );
}
