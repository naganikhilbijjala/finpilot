import { createClient } from "@/lib/supabase/server";

/**
 * A SnapTrade Personal key represents one person, so SnapTrade data is only
 * ever served to the account whose email matches OWNER_EMAIL. Fails closed
 * when OWNER_EMAIL is unset.
 */
export function isOwnerEmail(email: string | null | undefined): boolean {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(owner && email && email.trim().toLowerCase() === owner);
}

export type OwnerCheck =
  | { ok: true; email: string }
  | { ok: false; status: 401 | 403; message: string };

export async function checkOwner(): Promise<OwnerCheck> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, message: "You must be logged in" };
  }
  if (!isOwnerEmail(user.email)) {
    return {
      ok: false,
      status: 403,
      message: "SnapTrade data is only available to the app owner",
    };
  }
  return { ok: true, email: user.email! };
}
