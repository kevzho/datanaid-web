"use client";

import { Loader2, CheckCircle2, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type UploadStage = "parsing" | "analyzing" | "done";

const STAGES: { key: UploadStage; label: string; pct: number }[] = [
  { key: "parsing", label: "Parsing file", pct: 40 },
  { key: "analyzing", label: "Running analysis", pct: 85 },
  { key: "done", label: "Complete", pct: 100 },
];

export function UploadProgress({ stage, fileName }: { stage: UploadStage; fileName: string }) {
  const current = STAGES.find((s) => s.key === stage) ?? STAGES[0];

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{fileName}</p>
          <p className="text-xs text-muted-foreground">{current.label}…</p>
        </div>
        {stage === "done" ? (
          <CheckCircle2 className="h-5 w-5 text-success" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
      </div>

      <Progress value={current.pct} className="mt-4" />

      <div className="mt-4 flex items-center justify-between text-xs">
        {STAGES.map((s, i) => {
          const reached = current.pct >= s.pct;
          return (
            <span
              key={s.key}
              className={cn(
                "flex items-center gap-1.5",
                reached ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  reached ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
              {s.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
