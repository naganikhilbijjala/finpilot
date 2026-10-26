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
        <li key={r.key} className="flex items-center justify-between py-2 gap-4">
          <div className="min-w-0">
            <div className="font-medium truncate">{r.name}</div>
            {r.detail && <div className="text-xs text-gray-500">{r.detail}</div>}
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
              r.ok ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"
            }`}
          >
            {r.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
