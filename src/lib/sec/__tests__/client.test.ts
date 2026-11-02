import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const respond = (status: number, headers: Record<string, string> = {}) =>
  new Response(status === 200 ? "{}" : "", { status, headers });

describe("secFetch", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("spaces requests out instead of bursting", async () => {
    const starts: number[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        starts.push(Date.now());
        return respond(200);
      })
    );
    const { secFetch } = await import("../client");
    const all = Promise.all(Array.from({ length: 10 }, (_, i) => secFetch(`https://data.sec.gov/${i}`)));
    await vi.runAllTimersAsync();
    await all;
    expect(starts).toHaveLength(10);
    // 10 requests take at least 9 intervals: no more than ~6 a second.
    expect(starts[9] - starts[0]).toBeGreaterThanOrEqual(9 * 160);
    for (let i = 1; i < starts.length; i++) expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(160);
  });

  it("waits out a 429 and retries", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(respond(429, { "retry-after": "3" })).mockResolvedValue(respond(200));
    vi.stubGlobal("fetch", fetchMock);
    const { secFetch } = await import("../client");
    const p = secFetch("https://data.sec.gov/x");
    await vi.advanceTimersByTimeAsync(2_900);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.runAllTimersAsync();
    expect((await p).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up with a rate-limit error after repeated 429s", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respond(429)));
    const { secFetch, SecRateLimitError } = await import("../client");
    const p = secFetch("https://data.sec.gov/x");
    const check = expect(p).rejects.toBeInstanceOf(SecRateLimitError);
    await vi.runAllTimersAsync();
    await check;
  });

  it("fails fast on other errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respond(404)));
    const { secFetch } = await import("../client");
    const p = secFetch("https://data.sec.gov/x");
    const check = expect(p).rejects.toThrow("SEC 404 for /x");
    await vi.runAllTimersAsync();
    await check;
  });
});
