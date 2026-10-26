import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { Logo } from "@/components/layout/Logo";
import {
  ArrowRightIcon,
  BankIcon,
  ChartIcon,
  LayersIcon,
  PercentIcon,
  ShieldIcon,
  UploadIcon,
} from "@/components/ui/Icons";
import { createClient } from "@/lib/supabase/server";

const FEATURES = [
  {
    icon: <LayersIcon />,
    title: "Every account, one number",
    body: "Net worth, cash and holdings across all your brokerages. The same ticker is combined so you see what you really own.",
  },
  {
    icon: <ChartIcon />,
    title: "Performance vs the market",
    body: "Time-weighted returns charted against the S&P 500, Nasdaq-100 and total market, with dividends reinvested.",
  },
  {
    icon: <PercentIcon />,
    title: "Returns that tell the truth",
    body: "XIRR and CAGR account for when you added money, per account and per ticker, including closed positions.",
  },
  {
    icon: <UploadIcon />,
    title: "Bring your history",
    body: "Import Fidelity or Robinhood CSVs, or log trades by hand. Re-importing never creates duplicates.",
  },
  {
    icon: <BankIcon />,
    title: "Live brokerage sync",
    body: "Connect through SnapTrade for current positions and balances without sharing your brokerage login.",
  },
  {
    icon: <ShieldIcon />,
    title: "Read-only by design",
    body: "FinScope can look but never trade. Your brokerage data is only ever shown to you.",
  },
];

const STEPS = [
  { n: "1", title: "Connect or import", body: "Link your brokerage or upload an activity CSV." },
  { n: "2", title: "We do the math", body: "Prices, dividends and cash flows are stitched into daily values." },
  { n: "3", title: "See the full picture", body: "Allocation, gains and benchmarks on one dashboard." },
];

const primaryCta =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-base font-medium text-white shadow-md shadow-primary-600/25 transition-all hover:bg-primary-700 hover:shadow-lg active:scale-[0.98]";
const secondaryCta =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-800 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50 active:scale-[0.98]";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in users go straight to their dashboard.
  if (user) redirect("/dashboard");

  return (
    <div className="bg-white">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex" aria-label="Sections">
            <a href="#features" className="hover:text-gray-900">Features</a>
            <a href="#how" className="hover:text-gray-900">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
          <div className="absolute left-1/2 top-0 h-[28rem] w-[60rem] -translate-x-1/2 rounded-full bg-primary-200/40 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-8 lg:pt-24">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                Portfolio analytics for self-directed investors
              </span>
              <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Know exactly how your{" "}
                <span className="bg-gradient-to-r from-primary-600 to-sky-500 bg-clip-text text-transparent">
                  investments
                </span>{" "}
                are doing
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
                Combine every brokerage account, see real returns, and check yourself against the
                market. No spreadsheets, no guesswork.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className={primaryCta}>
                  Create free account <ArrowRightIcon className="h-5 w-5" />
                </Link>
                <Link href="/login" className={secondaryCta}>
                  Sign in
                </Link>
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm text-gray-500">
                <ShieldIcon className="h-4 w-4 text-emerald-600" />
                Read-only access. We can never place trades.
              </p>
            </div>

            <div className="animate-fade-up [animation-delay:150ms]">
              <ProductPreview />
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-t border-gray-100 bg-gray-50/60 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                Everything your brokerage app doesn&apos;t show you
              </h2>
              <p className="mt-4 text-gray-600">
                Built around the questions that matter: how much do I have, how am I really doing, and
                am I beating the index?
              </p>
            </div>
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-gray-200/80 bg-white p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                    {f.icon}
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              Up and running in minutes
            </h2>
            <ol className="mt-14 grid gap-8 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="relative rounded-2xl border border-gray-200/80 p-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
                    {s.n}
                  </span>
                  <h3 className="mt-4 font-semibold text-gray-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-gray-600">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-800 to-gray-900 px-6 py-14 text-center sm:py-16">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-400/25 blur-3xl" />
            <h2 className="relative text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              See your whole portfolio in one place
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-primary-100">
              Create an account and add your first transaction in under a minute.
            </p>
            <div className="relative mt-8">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-medium text-primary-700 shadow-md transition-all hover:bg-primary-50 active:scale-[0.98]"
              >
                Get started free <ArrowRightIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-gray-500 sm:flex-row sm:px-6 lg:px-8">
          <Logo />
          <p>© {new Date().getFullYear()} FinScope. For information only, not investment advice.</p>
        </div>
      </footer>
    </div>
  );
}
