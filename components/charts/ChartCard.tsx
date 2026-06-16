import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChartInsight } from "./ChartInsight";

interface InsightProps {
  what: string;
  why: string;
  action: string;
}

interface ChartCardProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  insight?: InsightProps;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  description,
  actions,
  insight,
  children,
  className,
}: ChartCardProps) {
  return (
    <Card className={cn("rounded-xl", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1 text-xs">{description}</CardDescription>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-1">{actions}</div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-5">
        {children}
        {insight && (
          <div className="mt-4 rounded-lg bg-muted/40 p-4">
            <ChartInsight
              what={insight.what}
              why={insight.why}
              action={insight.action}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
