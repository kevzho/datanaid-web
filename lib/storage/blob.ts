import "server-only";
import { put, head, del, list } from "@vercel/blob";
import type { AnalysisResult } from "@/types/dataset";

/**
 * Vercel Blob persistence for analyses.
 *
 * Each analysis is stored as a JSON blob under `analyses/<id>.json`. This lets
 * users return to a shareable result URL without re-uploading. Persistence is
 * a progressive enhancement: when BLOB_READ_WRITE_TOKEN is absent (e.g. local
 * dev without a Blob store), the app still works fully in-session — only cross-
 * session persistence is disabled.
 */

export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

const PREFIX = "analyses/";

export interface SavedAnalysisRef {
  id: string;
  url: string;
  fileName: string;
  createdAt: string;
}

export async function saveAnalysis(result: AnalysisResult): Promise<SavedAnalysisRef | null> {
  if (!isBlobConfigured()) return null;
  const key = `${PREFIX}${result.id}.json`;
  const blob = await put(key, JSON.stringify(result), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
  return {
    id: result.id,
    url: blob.url,
    fileName: result.fileName,
    createdAt: result.createdAt,
  };
}

export async function loadAnalysis(id: string): Promise<AnalysisResult | null> {
  if (!isBlobConfigured()) return null;
  const key = `${PREFIX}${id}.json`;
  try {
    const meta = await head(key);
    if (!meta) return null;
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as AnalysisResult;
  } catch {
    return null;
  }
}

export async function listAnalyses(): Promise<SavedAnalysisRef[]> {
  if (!isBlobConfigured()) return [];
  try {
    const { blobs } = await list({ prefix: PREFIX });
    return blobs.map((b) => ({
      id: b.pathname.replace(PREFIX, "").replace(/\.json$/, ""),
      url: b.url,
      fileName: b.pathname,
      createdAt: b.uploadedAt instanceof Date ? b.uploadedAt.toISOString() : String(b.uploadedAt),
    }));
  } catch {
    return [];
  }
}

export async function deleteAnalysis(id: string): Promise<boolean> {
  if (!isBlobConfigured()) return false;
  try {
    await del(`${PREFIX}${id}.json`);
    return true;
  } catch {
    return false;
  }
}
