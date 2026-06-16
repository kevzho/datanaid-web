import { NextRequest, NextResponse } from "next/server";
import type { ParsedDataset } from "@/types/dataset";
import { runAnalysis } from "@/lib/analytics/engine";
import { phraseInsights } from "@/lib/analytics/llm-phrasing";
import { saveAnalysis, isBlobConfigured } from "@/lib/storage/blob";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Server-side analysis endpoint.
 * Body: { dataset: ParsedDataset, persist?: boolean }
 * Returns the full AnalysisResult, with LLM-phrased insights when an API key
 * is configured (otherwise deterministic prose). Optionally persists to Blob.
 */
export async function POST(req: NextRequest) {
  let payload: { dataset?: ParsedDataset; persist?: boolean };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const dataset = payload.dataset;
  if (!dataset || !Array.isArray(dataset.rows) || !Array.isArray(dataset.headers)) {
    return NextResponse.json({ error: "Missing or malformed dataset." }, { status: 400 });
  }
  if (dataset.rows.length === 0) {
    return NextResponse.json({ error: "Dataset has no rows." }, { status: 400 });
  }

  try {
    const result = runAnalysis(dataset);

    // Hybrid insight phrasing (server-only; no-op without OPENAI_API_KEY).
    const phrased = await phraseInsights(result.insights.insights);
    result.insights.insights = phrased;
    // Rebuild byCategory from phrased insights.
    for (const key of Object.keys(result.insights.byCategory) as Array<
      keyof typeof result.insights.byCategory
    >) {
      result.insights.byCategory[key] = phrased.filter((i) => i.category === key);
    }

    let savedRef = null;
    if (payload.persist && isBlobConfigured()) {
      savedRef = await saveAnalysis(result);
    }

    return NextResponse.json({ result, saved: savedRef, persisted: !!savedRef });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed." },
      { status: 500 }
    );
  }
}
