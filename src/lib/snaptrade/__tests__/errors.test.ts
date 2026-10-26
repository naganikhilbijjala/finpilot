import { describe, expect, it } from "vitest";
import { describeError, httpStatusOf } from "../errors";

describe("describeError", () => {
  it("shows only the status for SDK errors that embed response headers", () => {
    const err = new Error(
      'Request failed with status code 410 RESPONSE HEADERS: { "date": "Mon", "server": "x" }'
    );
    expect(httpStatusOf(err)).toBe(410);
    expect(describeError(err)).toBe("SnapTrade returned HTTP 410");
    expect(describeError(err)).not.toContain("HEADERS");
  });

  it("prefers a structured response status", () => {
    expect(httpStatusOf({ response: { status: 500 } })).toBe(500);
  });

  it("falls back to a generic message", () => {
    expect(describeError(new Error("ECONNRESET secret-token"))).toBe(
      "Request to SnapTrade failed"
    );
    expect(describeError(undefined)).toBe("Request to SnapTrade failed");
  });
});
