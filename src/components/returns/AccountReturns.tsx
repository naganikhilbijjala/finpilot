import { formatMoney, formatPercent } from "@/lib/utils/format";
import type { AccountReturn } from "@/lib/returns/compute";
import { ReturnCell } from "./ReturnCell";

const gainClass = (v: number | null) =>
  v === null ? "text-gray-500" : v >= 0 ? "text-emerald-600" : "text-rose-600";

function Row({ r, bold }: { r: AccountReturn; bold?: boolean }) {
  return (
    <tr className={`border-t border-gray-100 transition-colors hover:bg-gray-50/70 ${bold ? "bg-primary-50/50 font-semibold hover:bg-primary-50/50" : ""}`}>
      <td className="num py-3 pr-3">{r.name}</td>
      <td className="num py-3 px-3 text-right">{formatMoney(r.value, "USD")}</td>
      <td className="num py-3 px-3 text-right">
        {formatMoney(r.contributed - r.withdrawn, "USD")}
      </td>
      <td className={`num py-3 px-3 text-right ${gainClass(r.gain)}`}>
        {formatMoney(r.gain, "USD")}
      </td>
      <td className="num py-3 px-3 text-right">{formatMoney(r.dividends, "USD")}</td>
      <td className="num py-3 px-3 text-right">{formatMoney(r.interest, "USD")}</td>
      <td className={`num py-3 px-3 text-right ${gainClass(r.gain)}`}>
        {r.gain !== null && r.contributed > 0
          ? formatPercent((r.gain / r.contributed) * 100)
          : "—"}
      </td>
      <td className="num py-3 px-3 text-right">
        <ReturnCell value={r.xirr} shortHistory={r.shortHistory} />
      </td>
      <td className="num py-3 pl-3 text-right text-gray-600">{r.since ?? "—"}</td>
    </tr>
  );
}

export function AccountReturns({
  portfolio,
  accounts,
}: {
  portfolio: AccountReturn;
  accounts: AccountReturn[];
}) {
  return (
    <div className="overflow-x-auto px-5 pb-5 text-gray-900 sm:px-6">
      <table className="min-w-full text-sm">
        <thead className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
          <tr>
            <th className="py-2 pr-3">Account</th>
            <th className="num py-3 px-3 text-right">Value</th>
            <th className="num py-3 px-3 text-right">Net deposited</th>
            <th className="num py-3 px-3 text-right">Gain</th>
            <th className="num py-3 px-3 text-right" title="Paid by stocks and funds, cash or reinvested. Already included in Gain.">Dividends</th>
            <th className="num py-3 px-3 text-right" title="Earned on money-market sweep funds such as SPAXX. Already included in Gain.">Interest</th>
            <th className="num py-3 px-3 text-right" title="Gain divided by total deposited; not annualized">Total return</th>
            <th className="num py-3 px-3 text-right">Annualized</th>
            <th className="num py-3 pl-3 text-right">Since</th>
          </tr>
        </thead>
        <tbody>
          <Row r={portfolio} bold />
          {accounts.map((a) => (
            <Row key={a.id} r={a} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
