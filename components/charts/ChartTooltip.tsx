"use client";

import * as React from "react";
import type { TooltipProps } from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { cn } from "@/lib/utils";

interface ChartTooltipContentProps extends TooltipProps<ValueType, NameType> {
  valueFormatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string) => string;
  className?: string;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
  className,
}: ChartTooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  const formattedLabel = labelFormatter ? labelFormatter(String(label)) : label;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-popover px-3 py-2 shadow-lg",
        className
      )}
    >
      {formattedLabel !== undefined && formattedLabel !== "" && (
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          {formattedLabel}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => {
          const rawValue = entry.value as number;
          const name = String(entry.name ?? "");
          const formatted = valueFormatter
            ? valueFormatter(rawValue, name)
            : typeof rawValue === "number"
            ? rawValue.toLocaleString("en-US", { maximumFractionDigits: 2 })
            : String(rawValue ?? "");

          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color ?? "hsl(var(--chart-1))" }}
              />
              <span className="text-xs text-muted-foreground">{name}</span>
              <span className="ml-auto pl-4 text-xs font-medium tabular-nums text-popover-foreground">
                {formatted}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
