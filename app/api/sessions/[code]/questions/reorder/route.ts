import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { logger } from "@/lib/log";
import { requireFacilitator } from "@/lib/auth/require-facilitator";
import { isCompleteQuestionOrder } from "@/lib/question-order";

type Params = { params: Promise<{ code: string }> };

// POST /api/sessions/[code]/questions/reorder — opdater rækkefølgen af spørgsmål
export async function POST(req: NextRequest, { params }: Params) {
  const unauthorised = await requireFacilitator();
  if (unauthorised) return unauthorised;
  const { code } = await params;
  const { order } = await req.json();

  if (!Array.isArray(order) || !order.every((id) => typeof id === "string")) {
    logger.warn("questions reorder: invalid order payload", { code });
    return NextResponse.json(
      { error: "order (array of question ids) required" },
      { status: 400 }
    );
  }

  const sessions = await sql`SELECT id FROM sessions WHERE code = ${code.toUpperCase()}`;
  if (sessions.length === 0) {
    logger.warn("questions reorder: session not found", { code });
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  const sessionId = sessions[0].id as string;

  // An order must contain every current question exactly once. Partial or
  // duplicated lists could otherwise create colliding positions.
  const existing = await sql`SELECT id FROM questions WHERE session_id = ${sessionId}`;
  if (!isCompleteQuestionOrder(order, existing.map((row) => row.id as string))) {
    logger.warn("questions reorder: incomplete or invalid question order", { code });
    return NextResponse.json({ error: "order must contain every session question exactly once" }, { status: 400 });
  }

  await sql.transaction((tx) =>
    order.map((id, position) =>
      tx`UPDATE questions SET position = ${position} WHERE id = ${id} AND session_id = ${sessionId}`
    )
  );

  logger.info("questions reordered", { code, count: order.length });
  return NextResponse.json({ ok: true });
}
