"use client";

import * as React from "react";
import { Lightbulb, ShieldCheck, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAnalysis } from "@/lib/store/analysis-store";
import type { Insight, InsightCategory } from "@/types/dataset";

const CATEGORY_ORDER: { key: InsightCategory; label: string }[] = [
  { key: "finding", label: "Findings" },
  { key: "trend", label: "Trends" },
  { key: "risk", label: "Risks" },
  { key: "opportunity", label: "Opportunities" },
  { key: "recommendation", label: "Recommendations" },
];

function InsightGrid({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No insights in this category for your dataset.
      </p>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {insights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}

export default function InsightsPage() {
  const { result } = useAnalysis();

  if (!result) {
    return (
      <DashboardShell
        title="Insights"
        description="Grounded, evidence-backed findings about your data."
      >
        <EmptyState
          icon={Lightbulb}
          title="No insights yet"
          description="Upload a dataset and Datanaid will generate grounded insights — every claim traced to a computed statistic, never invented."
          actionLabel="Upload a dataset"
          actionHref="/upload"
        />
      </DashboardShell>
    );
  }

  const { insights } = result;
  const all = insights.insights;
  const categories = CATEGORY_ORDER.filter(
    (c) => (insights.byCategory[c.key]?.length ?? 0) > 0
  );

  return (
    <DashboardShell
      title="Insights"
      description={`${all.length} grounded insights from ${result.fileName}.`}
      actions={
        <span className="flex items-center gap-1.5 text-xs font-medium text-success">
          <ShieldCheck className="h-3.5 w-3.5" />
          No hallucinations — every insight is grounded
        </span>
      }
    >
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Each insight follows a strict contract — a{" "}
            <span className="font-medium text-foreground">finding</span>, its{" "}
            <span className="font-medium text-foreground">evidence</span>, why it{" "}
            <span className="font-medium text-foreground">matters</span>, and a{" "}
            <span className="font-medium text-foreground">recommended action</span>. Every
            number traces back to a value computed directly from your data.
          </p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="all" className="gap-1.5">
              All
              <Badge variant="secondary" className="text-[10px]">
                {all.length}
              </Badge>
            </TabsTrigger>
            {categories.map((c) => (
              <TabsTrigger key={c.key} value={c.key} className="gap-1.5">
                {c.label}
                <Badge variant="secondary" className="text-[10px]">
                  {insights.byCategory[c.key].length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <InsightGrid insights={all} />
          </TabsContent>
          {categories.map((c) => (
            <TabsContent key={c.key} value={c.key} className="mt-6">
              <InsightGrid insights={insights.byCategory[c.key]} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardShell>
  );
}
