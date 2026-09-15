import { describe, it, expect, vi, afterEach } from "vitest";
import { logger } from "./log";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("info logs go to console.log as a JSON line with the message and level", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("session created", { code: "ABCD" });
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0]);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("session created");
    expect(parsed.code).toBe("ABCD");
    expect(typeof parsed.time).toBe("string");
  });

  it("warn logs go to console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("question already answered");
    expect(spy).toHaveBeenCalledOnce();
    expect(JSON.parse(spy.mock.calls[0][0]).level).toBe("warn");
  });

  it("error logs go to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("upload failed", { error: "boom" });
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0]);
    expect(parsed.level).toBe("error");
    expect(parsed.error).toBe("boom");
  });

  it("works with no context", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("no context here");
    const parsed = JSON.parse(spy.mock.calls[0][0]);
    expect(parsed.message).toBe("no context here");
  });
});
