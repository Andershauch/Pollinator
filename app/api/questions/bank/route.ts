import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireFacilitator } from "@/lib/auth/require-facilitator";

// GET /api/questions/bank — unikke spørgsmål brugt på tværs af sessioner
export async function GET() {
  const unauthorised = await requireFacilitator();
  if (unauthorised) return unauthorised;
  const rows = await sql`
    SELECT prompt, type, options, COUNT(*)::int AS times_used
    FROM questions
    GROUP BY prompt, type, options
    ORDER BY times_used DESC, prompt ASC
    LIMIT 200
  `;
  return NextResponse.json(rows);
}
