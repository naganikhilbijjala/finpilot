import { TickerLink } from "@/components/screener/TickerLink";
import { ExternalLinkIcon } from "@/components/ui/Icons";
import type { FeedItem, Importance } from "@/lib/sec/feed";

const DOT: Record<Importance, string> = {
  high: "bg-rose-500",
  normal: "bg-primary-500",
  low: "bg-gray-300",
};

const HELD: Record<FeedItem["held"], string> = {
  direct: "you own shares",
  funds: "through your funds",
  both: "shares + funds",
};

export function FilingItem({ item, showDate = false }: { item: FeedItem; showDate?: boolean }) {
  return (
    <li className="flex gap-3 py-3">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[item.importance]}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-semibold text-gray-900">
            {item.ticker ? <TickerLink ticker={item.ticker} /> : item.company}
          </span>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex min-w-0 items-baseline gap-1 text-sm text-gray-800 hover:text-primary-700"
          >
            <span className={item.importance === "high" ? "font-semibold text-rose-700 group-hover:text-primary-700" : ""}>
              {item.title}
            </span>
            <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 self-center text-gray-400 group-hover:text-primary-600" />
          </a>
        </div>
        {item.tags.length > 0 && <p className="mt-0.5 text-xs text-gray-600">Also: {item.tags.join(" · ")}</p>}
        <p className="num mt-1 text-xs text-gray-500">
          {showDate && `${item.filedAt} · `}
          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">{item.form}</span>
          {" · "}
          {item.exposurePct.toFixed(2)}% of your money, {HELD[item.held]}
        </p>
      </div>
    </li>
  );
}
