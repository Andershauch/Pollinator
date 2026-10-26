import { NextResponse } from "next/server";
import { getAuth } from "./server";

/**
 * Facilitator routes must check the session themselves as well as being
 * protected by middleware. This prevents a direct API call from bypassing UI
 * protection.
 */
export async function requireFacilitator() {
  const { data: session } = await getAuth().getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Log ind som facilitator først" }, { status: 401 });
  }

  return null;
}
