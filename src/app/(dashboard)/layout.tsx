import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { isOwnerEmail } from "@/lib/snaptrade/owner";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const email = user.email ?? "Account";
  return (
    <AppShell email={email} isOwner={isOwnerEmail(user.email)} signOut={signOut}>
      {children}
    </AppShell>
  );
}
