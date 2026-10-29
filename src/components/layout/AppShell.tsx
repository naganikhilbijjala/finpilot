import type { ReactNode } from "react";
import {
  BankIcon,
  ChartIcon,
  HomeIcon,
  LogoutIcon,
  PercentIcon,
  PlusIcon,
  SparkIcon,
  UploadIcon,
  WalletIcon,
} from "@/components/ui/Icons";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { NavLinks, type NavSection } from "./NavLinks";

function buildSections(isOwner: boolean): NavSection[] {
  const sections: NavSection[] = [
    { items: [{ href: "/dashboard", label: "Dashboard", icon: <HomeIcon /> }] },
  ];
  if (isOwner) {
    sections.push({
      title: "Brokerage",
      items: [
        { href: "/overview", label: "Overview", icon: <WalletIcon /> },
        { href: "/performance", label: "Performance", icon: <ChartIcon /> },
        { href: "/returns", label: "Returns", icon: <PercentIcon /> },
        { href: "/accounts", label: "Accounts", icon: <BankIcon /> },
      ],
    });
  }
  sections.push({
    title: "Research",
    items: [{ href: "/screener", label: "Screener", icon: <SparkIcon /> }],
  });
  sections.push({
    title: "Manual portfolio",
    items: [
      { href: "/portfolio/add", label: "Add transaction", icon: <PlusIcon /> },
      { href: "/portfolio/import", label: "Import CSV", icon: <UploadIcon /> },
    ],
  });
  return sections;
}

function SidebarBody({
  email,
  isOwner,
  signOut,
}: {
  email: string;
  isOwner: boolean;
  signOut: () => Promise<void>;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1">
        <NavLinks sections={buildSections(isOwner)} />
      </div>
      <div className="mt-6 border-t border-gray-200/80 pt-4">
        <div className="flex items-center gap-3 px-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold uppercase text-primary-700">
            {email.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{email}</p>
            <p className="text-xs text-gray-500">
              {isOwner ? "Brokerage connected" : "Manual portfolio"}
            </p>
          </div>
        </div>
        <form action={signOut} className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <LogoutIcon className="h-5 w-5 text-gray-400" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({
  email,
  isOwner,
  signOut,
  children,
}: {
  email: string;
  isOwner: boolean;
  signOut: () => Promise<void>;
  children: ReactNode;
}) {
  const sidebar = <SidebarBody email={email} isOwner={isOwner} signOut={signOut} />;

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-gray-200/80 bg-white px-3 py-5 lg:flex">
        <div className="mb-8 px-2">
          <Logo href="/dashboard" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{sidebar}</div>
      </aside>

      <MobileNav>{sidebar}</MobileNav>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}
