import { describe, expect, it } from "vitest";
import { isSlidesIntegrationRequest } from "./slides-integration";

describe("isSlidesIntegrationRequest", () => {
  const token = "slides-integration-test-token";

  it("accepts the matching bearer token", () => {
    expect(isSlidesIntegrationRequest(`Bearer ${token}`, token)).toBe(true);
  });

  it("rejects missing, malformed, and non-matching tokens", () => {
    expect(isSlidesIntegrationRequest(null, token)).toBe(false);
    expect(isSlidesIntegrationRequest(token, token)).toBe(false);
    expect(isSlidesIntegrationRequest("Bearer another-token", token)).toBe(false);
  });
});
