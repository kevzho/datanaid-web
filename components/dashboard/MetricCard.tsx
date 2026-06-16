"use client";

import * as React from "react";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { KPI } from "@/types/dataset";

interface MetricCardProps {
  kpi: KPI;
}

function deltaColorClass(direction?: "up" | "down" | "flat") {
  if (direction === "up") return "text-success";
  if (direction === "down") return "text-destructive";
  return "text-muted-foreground";
}

export function MetricCard({ kpi }: MetricCardProps) {
  const DeltaIcon =
    kpi.direction === "up"
      ? TrendingUp
      : kpi.direction === "down"
      ? TrendingDown
      : Minus;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm transition-all duration-150",
        "hover-elevate"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {kpi.label}
        </span>
        {kpi.hint && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="mt-0.5 rounded p-0.5 text-muted-foreground/60 hover:text-muted-foreground"
                  aria-label="More information"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                {kpi.hint}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <p className="mt-2 font-display text-xl font-semibold tabular-nums text-foreground">
        {kpi.value}
      </p>

      {(kpi.delta !== undefined || kpi.deltaLabel) && (
        <div
          className={cn(
            "mt-1.5 flex items-center gap-1 text-xs font-medium",
            deltaColorClass(kpi.direction)
          )}
        >
          <DeltaIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="tabular-nums">
            {kpi.delta !== undefined
              ? `${kpi.delta >= 0 ? "+" : ""}${kpi.delta.toFixed(1)}%`
              : ""}
            {kpi.deltaLabel ? ` ${kpi.deltaLabel}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
