import Link from "next/link";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  // Gradient via CSS, not an SVG <defs> id: the logo renders twice (sidebar and
  // mobile bar) and a duplicate id inside a hidden copy blanks the visible one.
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 rounded-[28%] bg-gradient-to-br from-[#6366f1] to-[#3730a3] ${className}`}
    >
      <svg viewBox="0 0 32 32" className="h-full w-full">
        <path
          d="M7 21.5 12.5 15l4 3.5L25 9.5"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="25" cy="9.5" r="2.2" fill="#fff" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight text-gray-900">
        FinScope
      </span>
    </Link>
  );
}
