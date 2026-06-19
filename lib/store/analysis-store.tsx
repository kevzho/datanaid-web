"use client";

import * as React from "react";
import type {
  AnalysisResult,
  Insight,
  InsightCategory,
  ParsedDataset,
} from "@/types/dataset";
import { getJsonUsageHeaders } from "@/lib/usage/client";

interface AnalysisState {
  dataset: ParsedDataset | null;
  result: AnalysisResult | null;
  status: "idle" | "parsing" | "analyzing" | "ready" | "error";
  error: string | null;
  warnings: string[];
  savedId: string | null;
}

interface AnalysisContextValue extends AnalysisState {
  setDataset: (dataset: ParsedDataset, warnings?: string[]) => void;
  analyze: (persist?: boolean) => Promise<void>;
  loadById: (id: string) => Promise<boolean>;
  reset: () => void;
}

const initialState: AnalysisState = {
  dataset: null,
  result: null,
  status: "idle",
  error: null,
  warnings: [],
  savedId: null,
};

const AnalysisContext = React.createContext<AnalysisContextValue | null>(null);

const INSIGHT_CATEGORIES: InsightCategory[] = [
  "finding",
  "trend",
  "event",
  "risk",
  "opportunity",
  "recommendation",
];

function normalizeInsight(insight: Partial<Insight>): Insight {
  const type = insight.type ?? insight.category ?? "finding";
  const severity = insight.severity ?? insight.importance ?? "medium";
  const whatHappened = insight.what_happened ?? insight.finding ?? "";

  return {
    id: insight.id ?? `insight-${Math.random().toString(36).slice(2, 10)}`,
    title: insight.title ?? whatHappened.split(".")[0] ?? "Insight",
    type,
    severity,
    confidence: insight.confidence ?? "medium",
    what_happened: whatHappened,
    evidence: insight.evidence ?? "Computed from the uploaded data.",
    what_contributed:
      insight.what_contributed ??
      "This is based on computed dataset statistics, not external assumptions.",
    potential_explanations: insight.potential_explanations ?? [],
    requires_investigation: insight.requires_investigation ?? false,
    why_it_matters:
      insight.why_it_matters ??
      "This affects how confidently the result should be interpreted.",
    recommended_action: insight.recommended_action ?? "",
    category: type,
    finding: whatHappened,
    importance: severity,
    metric: insight.metric ?? "insight",
    value: insight.value ?? "",
    column: insight.column,
    phrased: insight.phrased,
  };
}

function normalizeAnalysisResult(result: AnalysisResult): AnalysisResult {
  const normalizedInsights = (result.insights?.insights ?? []).map(normalizeInsight);
  const byCategory = INSIGHT_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = normalizedInsights.filter((insight) => insight.category === category);
      return acc;
    },
    {} as Record<InsightCategory, Insight[]>
  );

  return {
    ...result,
    insights: {
      generatedAt: result.insights?.generatedAt ?? new Date().toISOString(),
      grounded: true,
      insights: normalizedInsights,
      byCategory,
    },
  };
}

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AnalysisState>(initialState);
  const datasetRef = React.useRef<ParsedDataset | null>(null);

  const setDataset = React.useCallback((dataset: ParsedDataset, warnings: string[] = []) => {
    datasetRef.current = dataset;
    setState((s) => ({ ...s, dataset, warnings, status: "idle", error: null }));
  }, []);

  const analyze = React.useCallback(async (persist = false) => {
    const dataset = datasetRef.current;
    if (!dataset) {
      setState((s) => ({ ...s, error: "Upload a dataset first.", status: "error" }));
      return;
    }
    setState((s) => ({ ...s, status: "analyzing", error: null }));
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: getJsonUsageHeaders(),
        body: JSON.stringify({ dataset, persist }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState((s) => ({ ...s, status: "error", error: data.error ?? "Analysis failed." }));
        return;
      }
      setState((s) => ({
        ...s,
        result: normalizeAnalysisResult(data.result as AnalysisResult),
        savedId: data.saved?.id ?? null,
        status: "ready",
        error: null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        status: "error",
        error: err instanceof Error ? err.message : "Network error during analysis.",
      }));
    }
  }, []);

  const loadById = React.useCallback(async (id: string) => {
    setState((s) => ({ ...s, status: "analyzing", error: null }));
    try {
      const res = await fetch(`/api/analysis/${id}`);
      if (!res.ok) {
        setState((s) => ({ ...s, status: "error", error: "Saved analysis not found." }));
        return false;
      }
      const data = await res.json();
      setState((s) => ({
        ...s,
        result: normalizeAnalysisResult(data.result as AnalysisResult),
        savedId: id,
        status: "ready",
      }));
      return true;
    } catch {
      setState((s) => ({ ...s, status: "error", error: "Failed to load analysis." }));
      return false;
    }
  }, []);

  const reset = React.useCallback(() => {
    datasetRef.current = null;
    setState(initialState);
  }, []);

  const value = React.useMemo<AnalysisContextValue>(
    () => ({ ...state, setDataset, analyze, loadById, reset }),
    [state, setDataset, analyze, loadById, reset]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis(): AnalysisContextValue {
  const ctx = React.useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used within an AnalysisProvider");
  return ctx;
}
