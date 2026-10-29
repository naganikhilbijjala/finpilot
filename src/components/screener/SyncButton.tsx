"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function SyncButton({ remaining }: { remaining: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/screener/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setMessage(body.message ?? "Sync failed");
      } else {
        const parts = [`Synced ${body.synced}`];
        if (body.failed.length) parts.push(`${body.failed.length} failed`);
        if (body.hitLimit) parts.push("daily limit reached, try tomorrow");
        setMessage(parts.join(" · "));
        router.refresh();
      }
    } catch {
      setMessage("Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-xs text-gray-500">{message}</span>}
      <Button variant="outline" size="sm" loading={loading} onClick={sync}>
        {remaining > 0 ? `Load next 50 (${remaining} left)` : "Refresh oldest 50"}
      </Button>
    </div>
  );
}
