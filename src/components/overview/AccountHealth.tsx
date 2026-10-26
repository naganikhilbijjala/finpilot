import type { Overview } from "@/lib/snaptrade/aggregate";

export function AccountHealth({ o }: { o: Overview }) {
  const rows = [
    ...o.accounts.map((a) => ({
      key: a.id,
      name: a.name,
      detail: `${a.institution} · ${a.maskedNumber}`,
      ok: a.initialSyncCompleted !== false,
      status:
        a.initialSyncCompleted === false
          ? "Initial sync in progress"
          : a.holdingsSyncedAt
            ? `Synced ${new Date(a.holdingsSyncedAt).toLocaleString()}`
            : "Connected",
    })),
    ...o.failures.map((f) => ({
      key: f.accountId,
      name: f.accountName,
      detail: "",
      ok: false,
      status: f.message,
    })),
  ];

  return (
    <ul className="divide-y divide-gray-100 text-sm text-gray-900">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <div className="truncate font-medium">{r.name}</div>
            {r.detail && <div className="text-xs text-gray-500">{r.detail}</div>}
          </div>
          <span
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              r.ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${r.ok ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            {r.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
