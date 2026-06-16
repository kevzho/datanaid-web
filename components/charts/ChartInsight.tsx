import * as React from "react";
import { Eye, Target, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartInsightProps {
  what: string;
  why: string;
  action: string;
  className?: string;
}

export function ChartInsight({ what, why, action, className }: ChartInsightProps) {
  return (
    <div className={cn("space-y-2 text-sm", className)}>
      <div className="flex gap-2.5">
        <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div>
          <span className="font-medium text-muted-foreground">What this means</span>{" "}
          <span className="text-muted-foreground">{what}</span>
        </div>
      </div>
      <div className="flex gap-2.5">
        <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div>
          <span className="font-medium text-muted-foreground">Why it matters</span>{" "}
          <span className="text-muted-foreground">{why}</span>
        </div>
      </div>
      <div className="flex gap-2.5">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
        <div>
          <span className="font-medium text-foreground">Recommended action</span>{" "}
          <span className="text-foreground">{action}</span>
        </div>
      </div>
    </div>
  );
}
