import { describe, expect, it } from "vitest";
import { applySecurityHeaders } from "./security";

describe("applySecurityHeaders", () => {
  it("sets browser protections without opening cross-origin access", () => {
    const headers = new Headers();

    applySecurityHeaders(headers);

    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("marks authenticated and API responses as non-cacheable", () => {
    const headers = new Headers();

    applySecurityHeaders(headers, { noStore: true });

    expect(headers.get("Cache-Control")).toBe("private, no-store");
  });
});
