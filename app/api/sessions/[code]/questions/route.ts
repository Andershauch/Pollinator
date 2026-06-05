import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ code: string }> };

// POST /api/sessions/[code]/questions — tilføj spørgsmål
export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params;
  const { prompt, options, position, duration_seconds, type } = await req.json();

  const qtype = type === "wordcloud" ? "wordcloud" : "dilemma";
  const needsOptions = qtype === "dilemma";

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }
  if (needsOptions && (!Array.isArray(options) || options.length === 0)) {
    return NextResponse.json(
      { error: "options (non-empty array) required for dilemma questions" },
      { status: 400 }
    );
  }

  const sessions = await sql`
    SELECT id FROM sessions WHERE code = ${code.toUpperCase()}
  `;
  if (sessions.length === 0) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  // Auto-position: læg bagest hvis ikke angivet
  const pos =
    typeof position === "number"
      ? position
      : ((await sql`
          SELECT COALESCE(MAX(position) + 1, 0) AS next
          FROM questions
          WHERE session_id = ${sessions[0].id as string}
        `) as Array<{ next: number }>)[0].next;

  const dur = typeof duration_seconds === "number" && duration_seconds > 0
    ? duration_seconds
    : null;

  const safeOptions = needsOptions ? options : [];

  const rows = await sql`
    INSERT INTO questions (session_id, prompt, options, position, duration_seconds, type)
    VALUES (${sessions[0].id as string}, ${prompt.trim()}, ${JSON.stringify(safeOptions)}, ${pos}, ${dur}, ${qtype})
    RETURNING *
  `;

  return NextResponse.json(rows[0], { status: 201 });
}
