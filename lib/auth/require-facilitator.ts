import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isSlidesIntegrationRequest } from "./slides-integration";
import { getAuth } from "./server";

type FacilitatorAccessOptions = {
  allowSlidesIntegration?: boolean;
};

/**
 * Facilitator routes must check the session themselves as well as being
 * protected by middleware. This prevents a direct API call from bypassing UI
 * protection.
 */
export async function requireFacilitator(options: FacilitatorAccessOptions = {}) {
  if (options.allowSlidesIntegration) {
    const requestHeaders = await headers();
    if (isSlidesIntegrationRequest(requestHeaders.get("authorization"))) {
      return null;
    }
  }

  const { data: session } = await getAuth().getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Log ind som facilitator først" }, { status: 401 });
  }

  return null;
}
