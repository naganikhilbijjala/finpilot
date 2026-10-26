/**
 * HTTP status of a failed SDK call, or null. The SDK embeds the response
 * headers in `message`, so read the status from the structured field or a
 * "status code NNN" match and never surface the message itself.
 */
export function httpStatusOf(err: unknown): number | null {
  const e = err as { response?: { status?: number }; message?: string };
  if (typeof e?.response?.status === "number") return e.response.status;
  const match = e?.message?.match(/status code (\d{3})/);
  return match ? Number(match[1]) : null;
}

/** Short, safe error text for display. */
export function describeError(err: unknown): string {
  const status = httpStatusOf(err);
  if (status === 429 || /429 \(rate limit\)/.test((err as Error)?.message ?? "")) {
    return "SnapTrade rate limit reached; wait a minute and reload";
  }
  return status ? `SnapTrade returned HTTP ${status}` : "Request to SnapTrade failed";
}
