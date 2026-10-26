/**
 * Illustrative dashboard mock for the landing page. Static SVG with sample
 * numbers: it never touches real data.
 */
const ACCOUNT = "M0,150 C40,146 70,128 110,122 C150,116 175,134 215,110 C255,86 280,92 320,64 C360,36 395,52 440,24";
const BENCH = "M0,150 C45,148 75,136 115,134 C155,132 180,124 220,118 C260,112 290,104 325,92 C365,78 400,70 440,56";

export function ProductPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-primary-300/40 via-sky-200/30 to-transparent blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-elevated">
        <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50/80 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 text-xs text-gray-400">finscope / dashboard</span>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 p-3 text-white">
              <div className="text-[10px] font-medium text-primary-100">Net worth</div>
              <div className="num mt-1 text-base font-semibold sm:text-lg">$248,310</div>
              <div className="num text-[10px] text-primary-100">3 accounts</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <div className="text-[10px] font-medium text-gray-500">Unrealized gain</div>
              <div className="num mt-1 text-base font-semibold text-emerald-600 sm:text-lg">+$41,870</div>
              <div className="num text-[10px] text-emerald-600">+20.3% on cost</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <div className="text-[10px] font-medium text-gray-500">Annualized</div>
              <div className="num mt-1 text-base font-semibold text-gray-900 sm:text-lg">+14.2%</div>
              <div className="num text-[10px] text-gray-500">XIRR</div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-900">Return vs S&amp;P 500</span>
              <span className="num rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                +4.8 pts ahead
              </span>
            </div>
            <svg viewBox="0 0 440 170" className="h-36 w-full" role="img" aria-label="Sample chart of a portfolio outperforming a benchmark">
              <defs>
                <linearGradient id="lp-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#4f46e5" stopOpacity="0.25" />
                  <stop offset="1" stopColor="#4f46e5" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[30, 80, 130].map((y) => (
                <line key={y} x1="0" x2="440" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 4" />
              ))}
              <path d={`${ACCOUNT} L440,170 L0,170 Z`} fill="url(#lp-fill)" />
              <path d={BENCH} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />
              <path d={ACCOUNT} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="440" cy="24" r="4.5" fill="#4f46e5" stroke="#fff" strokeWidth="2" />
            </svg>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-6 -left-4 hidden animate-float rounded-xl border border-gray-200/80 bg-white p-3 shadow-elevated sm:block">
        <div className="text-[10px] font-medium text-gray-500">Top gainer</div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-[9px] font-bold text-emerald-700">
            NVDA
          </span>
          <span className="num text-sm font-semibold text-emerald-600">+82.4%</span>
        </div>
      </div>
    </div>
  );
}
