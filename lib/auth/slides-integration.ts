import { timingSafeEqual } from "node:crypto";

const BEARER_PREFIX = "Bearer ";

/**
 * Checks the server-only credential used by the Google Slides add-on.
 * The credential is deliberately separate from facilitator sessions and is
 * only accepted by the small set of routes the add-on needs.
 */
export function isSlidesIntegrationRequest(
  authorization: string | null,
  configuredToken = process.env.POLLINATOR_SLIDES_API_TOKEN,
) {
  if (!configuredToken || !authorization?.startsWith(BEARER_PREFIX)) {
    return false;
  }

  const received = Buffer.from(authorization.slice(BEARER_PREFIX.length));
  const expected = Buffer.from(configuredToken);

  return received.length === expected.length && timingSafeEqual(received, expected);
}
