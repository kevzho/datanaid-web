import { NextRequest, NextResponse } from "next/server";
import { loadAnalysis, deleteAnalysis } from "@/lib/storage/blob";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await loadAnalysis(id);
  if (!result) {
    return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
  }
  return NextResponse.json({ result });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deleteAnalysis(id);
  return NextResponse.json({ deleted: ok });
}
