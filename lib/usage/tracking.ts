import "server-only";
import { createHash, randomUUID } from "crypto";
import { list, put } from "@vercel/blob";
import type { AnalysisResult, ParsedDataset } from "@/types/dataset";
import { isBlobConfigured } from "@/lib/storage/blob";

const PREFIX = "usage-events/";

interface BaseUsageEvent {
  eventId: string;
  occurredAt: string;
  anonymousUserId: string;
  sessionId?: string;
  ipHash?: string;
  userAgentHash?: string;
}

export interface PageViewUsageEvent extends BaseUsageEvent {
  event: "page_view";
  path: string;
}

export interface AnalysisUsageEvent extends BaseUsageEvent {
  event: "analysis_completed";
  analysisId: string;
  fileExtension: string;
  rowCount: number;
  columnCount: number;
  insightCount: number;
  trendCount: number;
  forecastCount: number;
  riskCount: number;
  persisted: boolean;
  groqEnabled: boolean;
}

export type UsageEvent = PageViewUsageEvent | AnalysisUsageEvent;

export interface UsageStats {
  uniqueVisitors: number;
  uniqueUsers: number;
  pageViews: number;
  submissions: number;
  lastUpdated: string;
  storage: "blob" | "memory";
}

const globalForUsage = globalThis as typeof globalThis & {
  __datanaidUsageEvents?: UsageEvent[];
};

const memoryEvents = (globalForUsage.__datanaidUsageEvents ??= []);

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

function usageIds(headers: Headers): Pick<
  BaseUsageEvent,
  "anonymousUserId" | "sessionId" | "ipHash" | "userAgentHash"
> {
  return {
    anonymousUserId: headers.get("x-datanaid-visitor-id")?.trim() || "anonymous",
    sessionId: headers.get("x-datanaid-session-id")?.trim() || undefined,
    ipHash: hash(requestIp(headers)),
    userAgentHash: hash(headers.get("user-agent")),
  };
}

async function persistUsageEvent(event: UsageEvent): Promise<void> {
  memoryEvents.push(event);

  if (!isBlobConfigured()) {
    console.info("datanaid_usage_event", event);
    return;
  }

  const key = `${PREFIX}${event.occurredAt.slice(0, 10)}/${event.event}-${event.eventId}.json`;
  await put(key, JSON.stringify(event), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export async function trackAnalysisUsage(params: {
  dataset: ParsedDataset;
  result: AnalysisResult;
  headers: Headers;
  saved: boolean;
}): Promise<void> {
  const event: AnalysisUsageEvent = {
    event: "analysis_completed",
    eventId: params.result.id,
    occurredAt: new Date().toISOString(),
    analysisId: params.result.id,
    ...usageIds(params.headers),
    fileExtension: extensionFor(params.dataset.fileName),
    rowCount: params.result.rowCount,
    columnCount: params.result.columnCount,
    insightCount: params.result.insights.insights.length,
    trendCount: params.result.trends.length,
    forecastCount: params.result.forecasts.length,
    riskCount: params.result.insights.byCategory.risk?.length ?? 0,
    persisted: params.saved,
    groqEnabled: !!process.env.GROQ_API_KEY,
  };

  await persistUsageEvent(event);
}

export async function trackPageViewUsage(params: {
  headers: Headers;
  path: string;
}): Promise<void> {
  const event: PageViewUsageEvent = {
    event: "page_view",
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    path: params.path || "/",
    ...usageIds(params.headers),
  };

  await persistUsageEvent(event);
}

function summarize(events: UsageEvent[], storage: UsageStats["storage"]): UsageStats {
  const visitors = new Set<string>();
  const users = new Set<string>();
  let pageViews = 0;
  let submissions = 0;

  for (const event of events) {
    if (event.anonymousUserId && event.anonymousUserId !== "anonymous") {
      visitors.add(event.anonymousUserId);
    }
    if (event.event === "page_view") {
      pageViews += 1;
    }
    if (event.event === "analysis_completed") {
      submissions += 1;
      if (event.anonymousUserId && event.anonymousUserId !== "anonymous") {
        users.add(event.anonymousUserId);
      }
    }
  }

  return {
    uniqueVisitors: visitors.size,
    uniqueUsers: users.size,
    pageViews,
    submissions,
    lastUpdated: new Date().toISOString(),
    storage,
  };
}

async function readBlobUsageEvents(): Promise<UsageEvent[]> {
  const { blobs } = await list({ prefix: PREFIX });
  const loaded = await Promise.allSettled(
    blobs.map(async (blob) => {
      const res = await fetch(blob.url, { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as UsageEvent;
    })
  );
  return loaded.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : []
  );
}

export async function getUsageStats(): Promise<UsageStats> {
  if (!isBlobConfigured()) {
    return summarize(memoryEvents, "memory");
  }

  try {
    return summarize(await readBlobUsageEvents(), "blob");
  } catch {
    return summarize(memoryEvents, "memory");
  }
}
