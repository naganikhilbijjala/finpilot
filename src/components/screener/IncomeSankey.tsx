import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import type { NodeKind, SankeyData, SankeyLink, SankeyNode } from "@/lib/screener/sankey";
import { formatCompactMoney } from "@/lib/utils/format";

const W = 980;
const H = 440;
const COLORS: Record<NodeKind, string> = {
  revenue: "#475569",
  cost: "#e11d48",
  profit: "#059669",
};
// Profit above costs within a column.
const KIND_ORDER: Record<NodeKind, number> = { revenue: 0, profit: 0, cost: 1 };

/** Static SVG (no client JS): d3 only does the layout, React draws it. */
export function IncomeSankey({ data, label }: { data: SankeyData; label: string }) {
  const revenue = data.nodes.find((n) => n.id === "revenue")!.value;

  const nodes = data.nodes
    .map((n) => ({ ...n }))
    .sort((a, b) => a.layer - b.layer || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  const links = data.links.map((l) => ({ ...l }));

  const graph = sankey<SankeyNode, SankeyLink>()
    .nodeId((n) => n.id)
    .nodeAlign((n) => n.layer)
    .nodeSort(null)
    .nodeWidth(14)
    .nodePadding(18)
    .extent([
      [120, 10],
      [W - 170, H - 10],
    ])({ nodes, links });

  const path = sankeyLinkHorizontal();

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label}
        className="h-auto w-full min-w-[720px]"
      >
        <g fill="none">
          {graph.links.map((l, i) => {
            const target = l.target as SankeyNode;
            const source = l.source as SankeyNode;
            return (
              <path
                key={i}
                d={path(l) ?? undefined}
                stroke={COLORS[target.kind]}
                strokeOpacity={0.3}
                strokeWidth={Math.max(1, l.width ?? 0)}
              >
                <title>{`${source.label} → ${target.label}: ${formatCompactMoney(l.value)}`}</title>
              </path>
            );
          })}
        </g>

        {graph.nodes.map((n) => {
          const x0 = n.x0 ?? 0;
          const x1 = n.x1 ?? 0;
          const y0 = n.y0 ?? 0;
          const y1 = n.y1 ?? 0;
          const first = n.layer === 0;
          const mid = (y0 + y1) / 2;
          const tiny = n.value / revenue < 0.008;
          return (
            <g key={n.id}>
              <rect x={x0} y={y0} width={x1 - x0} height={Math.max(1, y1 - y0)} rx={2} fill={COLORS[n.kind]}>
                <title>{`${n.label}: ${formatCompactMoney(n.value)} (${((n.value / revenue) * 100).toFixed(1)}% of revenue)`}</title>
              </rect>
              {!tiny && (
                <text
                  x={first ? x0 - 8 : x1 + 8}
                  y={mid}
                  textAnchor={first ? "end" : "start"}
                  fontSize={13}
                  // A white halo keeps labels legible where they cross flows.
                  stroke="white"
                  strokeWidth={4}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  fill="#111827"
                >
                  <tspan x={first ? x0 - 8 : x1 + 8} dy={-2} fontWeight={600}>
                    {n.label}
                  </tspan>
                  <tspan x={first ? x0 - 8 : x1 + 8} dy={16} fontSize={12} fill="#4b5563">
                    {formatCompactMoney(n.value)} · {((n.value / revenue) * 100).toFixed(0)}%
                  </tspan>
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
