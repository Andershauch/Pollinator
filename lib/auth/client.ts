import { createStandardAuthClient } from "@andershauch/auth/next/client";

/** Browser client using Pollinator's same-origin `/api/auth` proxy. */
export const authClient = createStandardAuthClient();
