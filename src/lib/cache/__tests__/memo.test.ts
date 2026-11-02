import { afterEach, describe, expect, it, vi } from "vitest";
import { memo } from "../memo";

afterEach(() => vi.useRealTimers());

describe("memo", () => {
  it("shares one in-flight load between concurrent callers", async () => {
    const m = memo<number>(1000);
    const load = vi.fn(() => new Promise<number>((r) => setTimeout(() => r(42), 5)));
    const results = await Promise.all(Array.from({ length: 6 }, () => m.get("k", load)));
    expect(results).toEqual([42, 42, 42, 42, 42, 42]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("serves from cache until the TTL passes", async () => {
    vi.useFakeTimers();
    const m = memo<number>(1000);
    const load = vi.fn(async () => 1);
    await m.get("k", load);
    vi.advanceTimersByTime(999);
    await m.get("k", load);
    expect(load).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2);
    await m.get("k", load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("doesn't cache failures", async () => {
    const m = memo<number>(1000);
    await expect(m.get("k", async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    await expect(m.get("k", async () => 7)).resolves.toBe(7);
  });

  it("lets the TTL depend on the value", async () => {
    vi.useFakeTimers();
    const m = memo<{ partial: boolean }>((v) => (v.partial ? 10 : 1000));
    const load = vi.fn(async () => ({ partial: true }));
    await m.get("k", load);
    vi.advanceTimersByTime(11);
    await m.get("k", load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps keys separate", async () => {
    const m = memo<string>(1000);
    expect(await m.get("a", async () => "A")).toBe("A");
    expect(await m.get("b", async () => "B")).toBe("B");
  });
});
