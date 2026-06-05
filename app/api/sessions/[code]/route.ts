import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ code: string }> };

type QuestionRow = {
  id: string;
  is_open: boolean;
  duration_seconds: number | null;
  opened_at: string | null;
};

// GET /api/sessions/[code] — hent session-state inkl. spørgsmål
export async function GET(_req: NextRequest, { params }: Params) {
  const { code } = await params;

  const rows = await sql`
    SELECT
      s.*,
      COALESCE(json_agg(q.* ORDER BY q.position) FILTER (WHERE q.id IS NOT NULL), '[]') AS questions
    FROM sessions s
    LEFT JOIN questions q ON q.session_id = s.id
    WHERE s.code = ${code.toUpperCase()}
    GROUP BY s.id
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const session = rows[0] as { current_question_id: string | null; questions: QuestionRow[] };
  const currentQ = session.questions.find((q) => q.id === session.current_question_id);

  // Auto-luk udløbne spørgsmål
  if (currentQ?.is_open && currentQ.duration_seconds && currentQ.opened_at) {
    const elapsed = (Date.now() - new Date(currentQ.opened_at).getTime()) / 1000;
    if (elapsed >= currentQ.duration_seconds) {
      await sql`UPDATE questions SET is_open = false WHERE id = ${currentQ.id}`;
      currentQ.is_open = false;
    }
  }

  return NextResponse.json(rows[0]);
}

// PATCH /api/sessions/[code] — skift state og/eller current_question_id
export async function PATCH(req: NextRequest, { params }: Params) {
  const { code } = await params;
  const body = await req.json();

  const hasCqid = "current_question_id" in body;
  const hasState = "state" in body;

  if (!hasCqid && !hasState) {
    return NextResponse.json(
      { error: "provide state and/or current_question_id" },
      { status: 400 }
    );
  }

  const VALID_STATES = ["lobby", "active", "closed"];
  if (hasState && !VALID_STATES.includes(body.state)) {
    return NextResponse.json(
      { error: `state must be one of: ${VALID_STATES.join(", ")}` },
      { status: 400 }
    );
  }

  // 1. Opdater sessions-rækken
  let rows;
  if (hasCqid && hasState) {
    rows = await sql`
      UPDATE sessions
      SET current_question_id = ${body.current_question_id},
          state               = ${body.state}
      WHERE code = ${code.toUpperCase()}
      RETURNING *
    `;
  } else if (hasCqid) {
    rows = await sql`
      UPDATE sessions
      SET current_question_id = ${body.current_question_id}
      WHERE code = ${code.toUpperCase()}
      RETURNING *
    `;
  } else {
    rows = await sql`
      UPDATE sessions
      SET state = ${body.state}
      WHERE code = ${code.toUpperCase()}
      RETURNING *
    `;
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const session = rows[0];

  // 2. Auto-styr is_open på spørgsmål når current_question_id ændres
  if (hasCqid) {
    await sql`
      UPDATE questions SET is_open = false
      WHERE session_id = ${session.id as string}
    `;
    if (body.current_question_id) {
      await sql`
        UPDATE questions SET is_open = true, opened_at = NOW()
        WHERE id = ${body.current_question_id} AND session_id = ${session.id as string}
      `;
    }
  }

  return NextResponse.json(session);
}
