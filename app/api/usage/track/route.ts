import { NextRequest, NextResponse } from "next/server";
import { trackPageViewUsage } from "@/lib/usage/tracking";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let path = "/";
  try {
    const body = await req.json();
    if (typeof body?.path === "string") path = body.path.slice(0, 240);
  } catch {
    /* page-view tracking should tolerate empty or malformed bodies */
  }

  try {
    await trackPageViewUsage({ headers: req.headers, path });
  } catch (err) {
    console.warn("Page-view tracking failed", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true });
}
