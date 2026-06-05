import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ code: string }> };

// POST /api/sessions/[code]/questions — tilføj spørgsmål
export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params;
  const { prompt, options, position } = await req.json();

  if (!prompt?.trim() || !Array.isArray(options) || options.length === 0) {
    return NextResponse.json(
      { error: "prompt (string) and options (non-empty array) required" },
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

  const rows = await sql`
    INSERT INTO questions (session_id, prompt, options, position)
    VALUES (${sessions[0].id as string}, ${prompt.trim()}, ${JSON.stringify(options)}, ${pos})
    RETURNING *
  `;

  return NextResponse.json(rows[0], { status: 201 });
}
