/**
 * Browser protections that are safe for Pollinator's same-origin UI.
 * Keep this deliberately small: a strict Content-Security-Policy needs a
 * separate review of Next.js' generated scripts and third-party assets.
 */
export function applySecurityHeaders(headers: Headers, options: { noStore?: boolean } = {}) {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  if (options.noStore) {
    headers.set("Cache-Control", "private, no-store");
  }
}
