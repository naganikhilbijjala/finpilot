import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Service-role client: bypasses RLS, so only ever call it from owner-gated server code. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local"
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
