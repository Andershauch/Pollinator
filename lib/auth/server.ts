import { createStandardNeonAuth } from "@andershauch/auth/next/server";

/**
 * Shared server-side Neon Auth instance for Pollinator.
 *
 * This stays lazy so `next build` does not need runtime-only Coolify secrets.
 * The AUTH package still validates both values on the first real request.
 */
let instance: ReturnType<typeof createStandardNeonAuth> | undefined;

export function getAuth() {
  instance ??= createStandardNeonAuth();
  return instance;
}
