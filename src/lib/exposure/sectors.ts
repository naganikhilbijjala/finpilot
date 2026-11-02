// Maps the SEC's four-digit industry code (SIC) onto the eleven GICS sectors
// that S&P uses, for companies outside the S&P 500 and 400 lists. SIC predates
// GICS, so this is an approximation (Alphabet and Meta are "software" in SIC);
// the S&P lists take priority wherever they cover a company.

type Range = [from: number, to: number, sector: string];

const IT = "Information Technology";
const HC = "Health Care";
const FIN = "Financials";
const RE = "Real Estate";
const CD = "Consumer Discretionary";
const CS = "Consumer Staples";
const IND = "Industrials";
const MAT = "Materials";
const EN = "Energy";
const UT = "Utilities";
const COM = "Communication Services";

// Most specific first: the first range containing the code wins.
const RANGES: Range[] = [
  [1300, 1389, EN],
  [1520, 1531, CD],
  [2830, 2836, HC],
  [2840, 2844, CS],
  [3021, 3021, CD],
  [3570, 3579, IT],
  [3630, 3639, CD],
  [3651, 3652, CD],
  [3660, 3699, IT],
  [3710, 3716, CD],
  [3750, 3751, CD],
  [3790, 3799, CD],
  [3812, 3812, IND],
  [3820, 3829, IT],
  [3840, 3851, HC],
  [3860, 3861, IT],
  [3870, 3873, CD],
  [5122, 5122, HC],
  [5140, 5149, CS],
  [5331, 5331, CS],
  [5400, 5499, CS],
  [5912, 5912, CS],
  [6798, 6798, RE],
  [7310, 7319, COM],
  [7370, 7379, IT],
  [7810, 7829, COM],
  [100, 999, CS],
  [1000, 1499, MAT],
  [1500, 1799, IND],
  [2000, 2199, CS],
  [2200, 2399, CD],
  [2400, 2499, MAT],
  [2500, 2599, CD],
  [2600, 2699, MAT],
  [2700, 2799, COM],
  [2800, 2899, MAT],
  [2900, 2999, EN],
  [3000, 3099, MAT],
  [3100, 3199, CD],
  [3200, 3399, MAT],
  [3400, 3699, IND],
  [3700, 3799, IND],
  [3800, 3899, IT],
  [3900, 3999, CD],
  [4000, 4799, IND],
  [4800, 4899, COM],
  [4900, 4999, UT],
  [5000, 5199, IND],
  [5200, 5999, CD],
  [6000, 6499, FIN],
  [6500, 6599, RE],
  [6700, 6799, FIN],
  [7000, 7299, CD],
  [7300, 7399, IND],
  [7500, 7599, CD],
  [7800, 7999, CD],
  [8000, 8099, HC],
  [8200, 8299, CD],
  [8700, 8799, IND],
  [9995, 9995, FIN],
];

export function sicToSector(sic: string | null | undefined): string | null {
  const code = Number(sic);
  if (!sic || !Number.isInteger(code) || code <= 0) return null;
  return RANGES.find(([from, to]) => code >= from && code <= to)?.[2] ?? null;
}
