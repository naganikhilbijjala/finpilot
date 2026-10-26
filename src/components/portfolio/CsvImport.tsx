"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { parseBrokerCsv, type ParseResult } from "@/lib/import/parsers";

const PREVIEW_ROWS = 10;

export function CsvImport() {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{
    inserted: number;
    duplicates: number;
  } | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setResult(null);
    setSummary(null);
    setError("");
    if (!file) return;

    setFileName(file.name);
    try {
      setResult(parseBrokerCsv(await file.text()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    }
  };

  const handleImport = async () => {
    if (!result) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/portfolio/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: result.rows }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Import failed");
      }
      setSummary(data);
      setResult(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="csv"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Broker CSV file
        </label>
        <input
          id="csv"
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-600 file:px-4 file:py-2 file:text-white hover:file:bg-primary-700"
        />
        <p className="mt-1 text-xs text-gray-500">
          Parsed in your browser; only the extracted buy rows are sent to the
          server.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {summary && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          Imported {summary.inserted} transaction
          {summary.inserted === 1 ? "" : "s"}
          {summary.duplicates > 0 &&
            `, skipped ${summary.duplicates} already in your portfolio`}
          .
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            <span className="font-medium capitalize">{result.broker}</span>{" "}
            file <span className="font-mono">{fileName}</span>:{" "}
            <span className="font-medium">{result.rows.length}</span> buys
            found, {result.skipped.length} rows skipped.
          </p>

          {result.rows.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Ticker</th>
                    <th className="px-3 py-2 text-right">Quantity</th>
                    <th className="px-3 py-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2">{r.purchased_at}</td>
                      <td className="px-3 py-2 font-medium">{r.ticker}</td>
                      <td className="px-3 py-2 text-right">{r.quantity}</td>
                      <td className="px-3 py-2 text-right">
                        ${r.price.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.rows.length > PREVIEW_ROWS && (
                <p className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100">
                  …and {result.rows.length - PREVIEW_ROWS} more
                </p>
              )}
            </div>
          )}

          {result.skipped.length > 0 && (
            <details className="text-sm text-gray-600">
              <summary className="cursor-pointer">
                Why were {result.skipped.length} rows skipped?
              </summary>
              <ul className="mt-2 max-h-48 overflow-y-auto space-y-1 font-mono text-xs">
                {result.skipped.map((s, i) => (
                  <li key={i}>
                    line {s.line}: {s.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <Button
            onClick={handleImport}
            loading={loading}
            disabled={result.rows.length === 0}
          >
            Import {result.rows.length} transaction
            {result.rows.length === 1 ? "" : "s"}
          </Button>
        </div>
      )}
    </div>
  );
}
