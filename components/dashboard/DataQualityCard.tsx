"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { QualityScore } from "@/types/dataset";

interface DataQualityCardProps {
  score: QualityScore;
}

function gradeColorClass(grade: "A" | "B" | "C" | "D" | "F"): string {
  switch (grade) {
    case "A":
    case "B":
      return "text-success border-success/40 bg-success/10";
    case "C":
      return "text-warning border-warning/40 bg-warning/10";
    case "D":
    case "F":
      return "text-destructive border-destructive/40 bg-destructive/10";
  }
}

function scoreColorClass(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}

function progressColorClass(value: number): string {
  if (value >= 80) return "[&>div]:bg-success";
  if (value >= 60) return "[&>div]:bg-warning";
  return "[&>div]:bg-destructive";
}

function severityDotClass(severity: "high" | "medium" | "low"): string {
  switch (severity) {
    case "high":
      return "bg-destructive";
    case "medium":
      return "bg-warning";
    case "low":
      return "bg-muted-foreground";
  }
}

const COMPONENT_LABELS: Record<string, string> = {
  completeness: "Completeness",
  uniqueness: "Uniqueness",
  consistency: "Consistency",
  validity: "Validity",
};

export function DataQualityCard({ score }: DataQualityCardProps) {
  const topIssues = score.issues.slice(0, 3);

  const components: Array<{ key: string; label: string; value: number }> = [
    { key: "completeness", label: COMPONENT_LABELS.completeness, value: score.components.completeness },
    { key: "uniqueness", label: COMPONENT_LABELS.uniqueness, value: score.components.uniqueness },
    { key: "consistency", label: COMPONENT_LABELS.consistency, value: score.components.consistency },
    { key: "validity", label: COMPONENT_LABELS.validity, value: score.components.validity },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Data Quality
          </p>
          <p className={cn("mt-1 font-display text-xl font-semibold tabular-nums", scoreColorClass(score.overall))}>
            {score.overall.toFixed(0)}/100
          </p>
        </div>
        {/* Grade badge ring */}
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 font-display text-xl font-bold",
            gradeColorClass(score.grade)
          )}
        >
          {score.grade}
        </div>
      </div>

      {/* Component bars */}
      <div className="space-y-3">
        {components.map(({ key, label, value }) => (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className={cn("text-xs font-medium tabular-nums", scoreColorClass(value))}>
                {value.toFixed(0)}%
              </span>
            </div>
            <Progress
              value={value}
              className={cn("h-1.5 bg-muted", progressColorClass(value))}
            />
          </div>
        ))}
      </div>

      {/* Top issues */}
      {topIssues.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Top issues</p>
          <ul className="space-y-1.5">
            {topIssues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                    severityDotClass(issue.severity)
                  )}
                />
                <span className="text-xs text-muted-foreground">{issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
