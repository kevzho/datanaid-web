"use client";

import * as React from "react";
import { ArrowRight, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Insight, InsightCategory } from "@/types/dataset";

interface InsightCardProps {
  insight: Insight;
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

function categoryBadgeVariant(category: InsightCategory): BadgeVariant {
  switch (category) {
    case "finding":
      return "secondary";
    case "trend":
      return "default";
    case "event":
      return "outline";
    case "risk":
      return "destructive";
    case "opportunity":
      return "outline"; // will use custom success color via className
    case "recommendation":
      return "outline"; // will use custom warning color via className
    default:
      return "secondary";
  }
}

function categoryBadgeClass(category: InsightCategory): string {
  switch (category) {
    case "opportunity":
      return "border-transparent bg-success/15 text-success hover:bg-success/25";
    case "recommendation":
      return "border-transparent bg-warning/15 text-warning hover:bg-warning/25";
    case "event":
      return "border-transparent bg-primary/10 text-primary hover:bg-primary/20";
    default:
      return "";
  }
}

function importanceDotClass(importance: "high" | "medium" | "low"): string {
  switch (importance) {
    case "high":
      return "bg-destructive";
    case "medium":
      return "bg-warning";
    case "low":
      return "bg-muted-foreground";
  }
}

function importanceLabelClass(importance: "high" | "medium" | "low"): string {
  switch (importance) {
    case "high":
      return "text-destructive";
    case "medium":
      return "text-warning";
    case "low":
      return "text-muted-foreground";
  }
}

const CATEGORY_LABELS: Record<InsightCategory, string> = {
  finding: "Finding",
  trend: "Trend",
  event: "Event",
  risk: "Risk",
  opportunity: "Opportunity",
  recommendation: "Recommendation",
};

export function InsightCard({ insight }: InsightCardProps) {
  const explanations = insight.potential_explanations ?? [];

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover-elevate transition-all duration-150">
      {/* Header: category badge + severity */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge
          variant={categoryBadgeVariant(insight.category)}
          className={cn("text-xs font-medium", categoryBadgeClass(insight.category))}
        >
          {CATEGORY_LABELS[insight.category]}
        </Badge>
        <div className={cn("flex items-center gap-1.5 text-xs font-medium", importanceLabelClass(insight.severity))}>
          <span
            className={cn("inline-block h-1.5 w-1.5 rounded-full", importanceDotClass(insight.severity))}
          />
          {insight.severity}
        </div>
      </div>

      {/* Main finding */}
      <h3 className="text-sm font-semibold leading-snug text-foreground">
        {insight.title}
      </h3>
      <p className="text-sm font-medium leading-relaxed text-foreground">
        {insight.what_happened}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {insight.why_it_matters}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="outline" className="text-[10px]">
          {insight.confidence} confidence
        </Badge>
        {insight.requires_investigation && (
          <Badge variant="outline" className="text-[10px] text-warning">
            needs investigation
          </Badge>
        )}
      </div>

      {/* Recommended action */}
      {insight.recommended_action && (
        <div className="mt-3 flex gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-xs text-foreground/80">{insight.recommended_action}</p>
        </div>
      )}

      <div className="mt-3 rounded-lg border border-border/70 bg-background/50 px-3 py-2.5">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Contributed:</span>{" "}
          {insight.what_contributed}
        </p>
        {explanations.length > 0 && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Potential explanation:</span>{" "}
            {explanations.join(" ")}
          </p>
        )}
      </div>

      {/* Evidence + optional AI-phrased badge */}
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground/60 hover:text-muted-foreground">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                <span className="font-medium">Evidence:</span> {insight.evidence}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            <span className="font-medium">Evidence:</span> {insight.evidence}
          </p>
        </div>
        {insight.phrased && (
          <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">
            AI-phrased
          </Badge>
        )}
      </div>
    </div>
  );
}
