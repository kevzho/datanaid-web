import { NextResponse } from "next/server";
import { getUsageStats } from "@/lib/usage/tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getUsageStats();
  return NextResponse.json(stats, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
