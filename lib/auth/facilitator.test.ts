import { describe, expect, it } from "vitest";
import { allowedFacilitatorEmails, isAllowedFacilitatorEmail } from "./facilitator";

describe("facilitator allowlist", () => {
  it("normalises whitespace and case", () => {
    const allowed = allowedFacilitatorEmails("  AndersLBI@gmail.com, host@example.com ");

    expect(isAllowedFacilitatorEmail("anderslbi@GMAIL.com", allowed)).toBe(true);
    expect(isAllowedFacilitatorEmail("host@example.com", allowed)).toBe(true);
  });

  it("fails closed for missing or unlisted addresses", () => {
    const allowed = allowedFacilitatorEmails("host@example.com");

    expect(isAllowedFacilitatorEmail(undefined, allowed)).toBe(false);
    expect(isAllowedFacilitatorEmail("visitor@example.com", allowed)).toBe(false);
    expect(isAllowedFacilitatorEmail("host@example.com", allowedFacilitatorEmails())).toBe(false);
  });
});
