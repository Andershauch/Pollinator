import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/questions/[id] — opdater is_open (luk/åbn stemmer uden at skifte spørgsmål)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  if (typeof body.is_open !== "boolean") {
    return NextResponse.json(
      { error: "is_open (boolean) required" },
      { status: 400 }
    );
  }

  const rows = await sql`
    UPDATE questions
    SET is_open = ${body.is_open}
    WHERE id = ${id}
    RETURNING *
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "question not found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}
