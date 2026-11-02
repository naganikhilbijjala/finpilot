// Well-known managers whose 13F is a fair picture of their portfolio: mostly
// long-only, concentrated and US-focused. Funds that run big short books or
// trade mostly bonds, futures or foreign shares (Bridgewater, Renaissance)
// are left out because their 13F would mislead.

export interface Manager {
  cik: number;
  /** Firm name. */
  name: string;
  /** Person most associated with it. */
  person: string;
  style: string;
  /** Shown on the manager's page when their 13F needs a caveat. */
  note?: string;
}

export const MANAGERS: Manager[] = [
  { cik: 1067983, name: "Berkshire Hathaway", person: "Warren Buffett & Greg Abel", style: "Value, very concentrated" },
  { cik: 1336528, name: "Pershing Square", person: "Bill Ackman", style: "Activist, ~10 stocks" },
  { cik: 1112520, name: "Akre Capital", person: "Akre / Neff / Saler", style: "Compounders, long holding" },
  { cik: 1709323, name: "Himalaya Capital", person: "Li Lu", style: "Deep value, very concentrated" },
  { cik: 1569205, name: "Fundsmith", person: "Terry Smith", style: "Quality growth" },
  { cik: 1536411, name: "Duquesne Family Office", person: "Stanley Druckenmiller", style: "Macro, trades often" },
  { cik: 1656456, name: "Appaloosa", person: "David Tepper", style: "Opportunistic" },
  { cik: 1061768, name: "Baupost Group", person: "Seth Klarman", style: "Deep value" },
  { cik: 1040273, name: "Third Point", person: "Dan Loeb", style: "Event-driven, activist" },
  { cik: 1061165, name: "Lone Pine Capital", person: "Stephen Mandel", style: "Growth, has shorts" },
  { cik: 1167483, name: "Tiger Global", person: "Chase Coleman", style: "Tech growth, has shorts" },
  { cik: 1135730, name: "Coatue", person: "Philippe Laffont", style: "Tech growth, has shorts" },
  { cik: 1541617, name: "Altimeter Capital", person: "Brad Gerstner", style: "Tech growth" },
  { cik: 1166559, name: "Gates Foundation Trust", person: "Gates Foundation", style: "Long-term endowment" },
  { cik: 1096343, name: "Markel Group", person: "Tom Gayner", style: "Value, insurance float" },
  { cik: 1034524, name: "Polen Capital", person: "Polen team", style: "Quality growth" },
  { cik: 1720792, name: "Ruane Cunniff (Sequoia)", person: "Ruane Cunniff team", style: "Quality value" },
  { cik: 1671657, name: "Dorsey Asset Management", person: "Pat Dorsey", style: "Moat investing" },
  { cik: 1641864, name: "Giverny Capital", person: "François Rochon", style: "Quality growth" },
  { cik: 1115373, name: "Semper Augustus", person: "Chris Bloomstran", style: "Value" },
  {
    cik: 1595888,
    name: "Jane Street",
    person: "Partnership",
    style: "Market maker, mostly hedged",
    note:
      "Jane Street is a trading firm, not a stock picker. About 87% of the value in its 13F is options, which aren't copied here, and its shares are mostly inventory and hedges for market making, held briefly. Its 13F lists thousands of positions; the copied return holds its 40 largest each quarter, so it shows what owning its biggest reported positions would have done, not how Jane Street itself performed.",
  },
];

export const findManager = (cik: number) => MANAGERS.find((m) => m.cik === cik) ?? null;
