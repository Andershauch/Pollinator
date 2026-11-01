/**
 * Pollinator has a small, explicit host group. Keep the list in an environment
 * variable so access can be changed without a database migration or deploy.
 */
export function allowedFacilitatorEmails(value = process.env.POLLINATOR_FACILITATOR_EMAILS): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAllowedFacilitatorEmail(
  email: string | null | undefined,
  allowed = allowedFacilitatorEmails()
): boolean {
  return Boolean(email && allowed.has(email.trim().toLowerCase()));
}
