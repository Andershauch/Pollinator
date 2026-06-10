import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/questions/[id] — opdater is_open, prompt, options eller duration
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  // is_open toggle (bruges af host-kontrolpanel)
  if (typeof body.is_open === "boolean") {
    const rows = await sql`
      UPDATE questions
      SET is_open   = ${body.is_open},
          opened_at = CASE WHEN ${body.is_open}::boolean THEN NOW() ELSE opened_at END
      WHERE id = ${id}
      RETURNING *
    `;
    if (rows.length === 0)
      return NextResponse.json({ error: "question not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  }

  // Full edit: prompt + options + duration + media
  const { prompt, options, duration_seconds, media_url, media_type } = body;
  if (!prompt?.trim())
    return NextResponse.json({ error: "prompt required" }, { status: 400 });

  const safeOptions = Array.isArray(options) ? options : [];
  const dur = typeof duration_seconds === "number" && duration_seconds > 0
    ? duration_seconds
    : null;
  const mUrl = typeof media_url === "string" && media_url ? media_url : null;
  const mType = typeof media_type === "string" && media_type ? media_type : null;

  const rows = await sql`
    UPDATE questions
    SET prompt           = ${prompt.trim()},
        options          = ${JSON.stringify(safeOptions)},
        duration_seconds = ${dur},
        media_url        = ${mUrl},
        media_type       = ${mType}
    WHERE id = ${id}
    RETURNING *
  `;
  if (rows.length === 0)
    return NextResponse.json({ error: "question not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

// DELETE /api/questions/[id] — slet spørgsmål
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  // Ryd tilhørende svar først (FK)
  await sql`DELETE FROM responses WHERE question_id = ${id}`;
  await sql`DELETE FROM word_responses WHERE question_id = ${id}`;

  const rows = await sql`DELETE FROM questions WHERE id = ${id} RETURNING id`;
  if (rows.length === 0)
    return NextResponse.json({ error: "question not found" }, { status: 404 });

  return NextResponse.json({ deleted: id });
}
