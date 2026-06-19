import "server-only";
import { createHash } from "crypto";
import { put } from "@vercel/blob";
import type { AnalysisResult, ParsedDataset } from "@/types/dataset";
import { isBlobConfigured } from "@/lib/storage/blob";

const PREFIX = "usage-events/";

export interface UsageEvent {
  event: "analysis_completed";
  occurredAt: string;
  analysisId: string;
  anonymousUserId: string;
  sessionId?: string;
  fileExtension: string;
  rowCount: number;
  columnCount: number;
  insightCount: number;
  trendCount: number;
  forecastCount: number;
  riskCount: number;
  persisted: boolean;
  groqEnabled: boolean;
  ipHash?: string;
  userAgentHash?: string;
}

function hash(value: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return createHash("sha256").update(trimmed).digest("hex").slice(0, 24);
}

function extensionFor(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "unknown";
}

function requestIp(headers: Headers): string | null {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip")
  );
}

export async function trackAnalysisUsage(params: {
  dataset: ParsedDataset;
  result: AnalysisResult;
  headers: Headers;
  saved: boolean;
}): Promise<void> {
  const anonymousUserId =
    params.headers.get("x-datanaid-visitor-id")?.trim() || "anonymous";
  const sessionId = params.headers.get("x-datanaid-session-id")?.trim() || undefined;

  const event: UsageEvent = {
    event: "analysis_completed",
    occurredAt: new Date().toISOString(),
    analysisId: params.result.id,
    anonymousUserId,
    sessionId,
    fileExtension: extensionFor(params.dataset.fileName),
    rowCount: params.result.rowCount,
    columnCount: params.result.columnCount,
    insightCount: params.result.insights.insights.length,
    trendCount: params.result.trends.length,
    forecastCount: params.result.forecasts.length,
    riskCount: params.result.insights.byCategory.risk?.length ?? 0,
    persisted: params.saved,
    groqEnabled: !!process.env.GROQ_API_KEY,
    ipHash: hash(requestIp(params.headers)),
    userAgentHash: hash(params.headers.get("user-agent")),
  };

  if (!isBlobConfigured()) {
    console.info("datanaid_usage_event", event);
    return;
  }

  const key = `${PREFIX}${event.occurredAt.slice(0, 10)}/${event.analysisId}.json`;
  await put(key, JSON.stringify(event), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}
