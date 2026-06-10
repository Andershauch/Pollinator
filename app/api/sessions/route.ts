import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET /api/sessions — liste over alle sessioner (til bank-drawer)
export async function GET() {
  const rows = await sql`
    SELECT
      s.id, s.code, s.title, s.created_at,
      COUNT(q.id)::int AS question_count
    FROM sessions s
    LEFT JOIN questions q ON q.session_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT 100
  `;
  return NextResponse.json(rows);
}

// Uppercase letters only — no I/O to avoid visual confusion
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomCode(): string {
  return Array.from(
    { length: 4 },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("");
}

// POST /api/sessions — opret ny session (facilitator)
export async function POST(req: NextRequest) {
  const { title } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  // Retry på den usandsynlige collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    try {
      const rows = await sql`
        INSERT INTO sessions (code, title, state)
        VALUES (${code}, ${title.trim()}, 'lobby')
        RETURNING *
      `;
      return NextResponse.json(rows[0], { status: 201 });
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code !== "23505") throw err; // kun retry på unique violation
    }
  }

  return NextResponse.json({ error: "could not generate unique code" }, { status: 500 });
}
