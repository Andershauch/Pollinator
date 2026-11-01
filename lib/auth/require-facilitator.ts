import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { isAllowedFacilitatorEmail } from "./facilitator";
import { getAuth } from "./server";

/**
 * Facilitator routes must check both the session and the explicit allowlist.
 * This prevents a direct API call or a self-created auth account from gaining
 * host access.
 */
export async function requireFacilitator() {
  const { data: session } = await getAuth().getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Log ind som facilitator først" }, { status: 401 });
  }

  if (!isAllowedFacilitatorEmail(session.user.email)) {
    return NextResponse.json({ error: "Denne konto har ikke værtsadgang" }, { status: 403 });
  }

  return null;
}

/** Use in server-rendered host and report pages before querying Pollinator data. */
export async function requireFacilitatorPage() {
  const { data: session } = await getAuth().getSession();
  if (!session?.user) redirect("/auth/sign-in");
  if (!isAllowedFacilitatorEmail(session.user.email)) {
    redirect("/auth/sign-in?error=not-authorized");
  }
}
