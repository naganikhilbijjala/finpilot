import "server-only";
import { Snaptrade, SnaptradeAuth } from "snaptrade-typescript-sdk";

let client: Snaptrade<ReturnType<typeof SnaptradeAuth.personalApiKey>> | null =
  null;

export function isSnaptradeConfigured(): boolean {
  return Boolean(
    process.env.SNAPTRADE_CLIENT_ID && process.env.SNAPTRADE_CONSUMER_KEY
  );
}

/**
 * Lazily-built SDK client (Personal key). Lazy so a missing key fails the
 * request that needs it, not `next build`.
 */
export function getSnaptrade() {
  if (client) return client;

  const clientId = process.env.SNAPTRADE_CLIENT_ID;
  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;
  if (!clientId || !consumerKey) {
    throw new Error(
      "SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY must be set in .env.local"
    );
  }

  client = new Snaptrade({
    auth: SnaptradeAuth.personalApiKey({ clientId, consumerKey }),
  });
  return client;
}
