import { formatMoney, formatPercent } from "@/lib/utils/format";
import type { AccountReturn } from "@/lib/returns/compute";
import { ReturnCell } from "./ReturnCell";

const gainClass = (v: number | null) =>
  v === null ? "text-gray-500" : v >= 0 ? "text-green-600" : "text-red-600";

function Row({ r, bold }: { r: AccountReturn; bold?: boolean }) {
  return (
    <tr className={`border-t border-gray-100 ${bold ? "bg-gray-50 font-semibold" : ""}`}>
      <td className="py-2 pr-3">{r.name}</td>
      <td className="py-2 px-3 text-right">{formatMoney(r.value, "USD")}</td>
      <td className="py-2 px-3 text-right">
        {formatMoney(r.contributed - r.withdrawn, "USD")}
      </td>
      <td className={`py-2 px-3 text-right ${gainClass(r.gain)}`}>
        {formatMoney(r.gain, "USD")}
      </td>
      <td className="py-2 px-3 text-right">{formatMoney(r.dividends, "USD")}</td>
      <td className="py-2 px-3 text-right">{formatMoney(r.interest, "USD")}</td>
      <td className={`py-2 px-3 text-right ${gainClass(r.gain)}`}>
        {r.gain !== null && r.contributed > 0
          ? formatPercent((r.gain / r.contributed) * 100)
          : "—"}
      </td>
      <td className="py-2 px-3 text-right">
        <ReturnCell value={r.xirr} shortHistory={r.shortHistory} />
      </td>
      <td className="py-2 pl-3 text-right text-gray-600">{r.since ?? "—"}</td>
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
    <div className="overflow-x-auto text-gray-900">
      <table className="min-w-full text-sm">
        <thead className="text-left text-gray-600 font-medium">
          <tr>
            <th className="py-2 pr-3">Account</th>
            <th className="py-2 px-3 text-right">Value</th>
            <th className="py-2 px-3 text-right">Net deposited</th>
            <th className="py-2 px-3 text-right">Gain</th>
            <th className="py-2 px-3 text-right" title="Paid by stocks and funds, cash or reinvested. Already included in Gain.">Dividends</th>
            <th className="py-2 px-3 text-right" title="Earned on money-market sweep funds such as SPAXX. Already included in Gain.">Interest</th>
            <th className="py-2 px-3 text-right" title="Gain divided by total deposited; not annualized">Total return</th>
            <th className="py-2 px-3 text-right">Annualized</th>
            <th className="py-2 pl-3 text-right">Since</th>
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
