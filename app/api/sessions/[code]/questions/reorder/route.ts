import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { logger } from "@/lib/log";

type Params = { params: Promise<{ code: string }> };

// POST /api/sessions/[code]/questions/reorder — opdater rækkefølgen af spørgsmål
export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params;
  const { order } = await req.json();

  if (!Array.isArray(order) || order.length === 0 || !order.every((id) => typeof id === "string")) {
    logger.warn("questions reorder: invalid order payload", { code });
    return NextResponse.json(
      { error: "order (non-empty array of question ids) required" },
      { status: 400 }
    );
  }

  const sessions = await sql`SELECT id FROM sessions WHERE code = ${code.toUpperCase()}`;
  if (sessions.length === 0) {
    logger.warn("questions reorder: session not found", { code });
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  const sessionId = sessions[0].id as string;

  // Sikr at alle id'er faktisk hører til denne session
  const existing = await sql`SELECT id FROM questions WHERE session_id = ${sessionId}`;
  const existingIds = new Set(existing.map((r) => r.id as string));
  if (!order.every((id: string) => existingIds.has(id))) {
    logger.warn("questions reorder: invalid question ids", { code });
    return NextResponse.json({ error: "order contains invalid question ids" }, { status: 400 });
  }

  for (let i = 0; i < order.length; i++) {
    await sql`UPDATE questions SET position = ${i} WHERE id = ${order[i] as string} AND session_id = ${sessionId}`;
  }

  logger.info("questions reordered", { code, count: order.length });
  return NextResponse.json({ ok: true });
}
