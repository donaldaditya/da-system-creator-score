"use client";

import type { ScoredCreator } from "@/types/creator";
import { LsTierBadge } from "@/components/ui/LsTierBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { RecommendationBadge } from "@/components/ui/RecommendationBadge";

interface ComparisonPanelProps {
  creators: ScoredCreator[];
  onRemove: (id: string) => void;
  onClose: () => void;
}

function formatNum(n?: number, prefix = ""): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`;
  return `${prefix}${n}`;
}

interface MetricRow {
  label: string;
  getValue: (c: ScoredCreator) => number | null;
  format: (v: number | null) => string;
  higherIsBetter?: boolean;
}

const METRICS: MetricRow[] = [
  {
    label: "Composite Score",
    getValue: (c) => c.composite.total,
    format: (v) => (v == null ? "—" : String(v)),
    higherIsBetter: true,
  },
  {
    label: "Branding Score",
    getValue: (c) => c.branding.total,
    format: (v) => (v == null ? "—" : String(v)),
    higherIsBetter: true,
  },
  {
    label: "Conversion Score",
    getValue: (c) => c.conversion.total,
    format: (v) => (v == null ? "—" : String(v)),
    higherIsBetter: true,
  },
  {
    label: "Followers",
    getValue: (c) => c.followers ?? null,
    format: (v) => formatNum(v ?? undefined),
    higherIsBetter: true,
  },
  {
    label: "GMV 30d",
    getValue: (c) => c.gmv30d ?? null,
    format: (v) => formatNum(v ?? undefined, "$"),
    higherIsBetter: true,
  },
  {
    label: "Engagement Rate",
    getValue: (c) => c.engagementRate ?? null,
    format: (v) => (v == null ? "—" : `${v.toFixed(1)}%`),
    higherIsBetter: true,
  },
  {
    label: "Avg GMV / Live",
    getValue: (c) => c.avgGmvPerLivestream ?? null,
    format: (v) => formatNum(v ?? undefined, "$"),
    higherIsBetter: true,
  },
];

export function ComparisonPanel({ creators, onRemove, onClose }: ComparisonPanelProps) {
  if (creators.length < 2) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{ backgroundColor: "#12121A", border: "1px solid #1E1E2E" }}
      >
        <p className="text-sm" style={{ color: "#6B7280" }}>
          Select at least 2 creators to compare.
        </p>
      </div>
    );
  }

  const getWinner = (metric: MetricRow): string | null => {
    const values = creators.map((c) => ({ id: c.id, val: metric.getValue(c) }));
    const withValues = values.filter((v) => v.val != null);
    if (withValues.length < 2) return null;

    const best = withValues.reduce((a, b) => {
      if (metric.higherIsBetter) {
        return (b.val ?? 0) > (a.val ?? 0) ? b : a;
      }
      return (b.val ?? 0) < (a.val ?? 0) ? b : a;
    });

    // Only highlight if strictly best (not tied)
    const isTie = withValues.filter((v) => v.val === best.val).length > 1;
    return isTie ? null : best.id;
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "#12121A", border: "1px solid #1E1E2E" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #1E1E2E" }}
      >
        <span className="text-sm font-semibold" style={{ color: "#E8EAF0" }}>
          Comparison ({creators.length})
        </span>
        <button
          onClick={onClose}
          className="text-xs px-2 py-1 rounded transition-colors"
          style={{ color: "#6B7280", border: "1px solid #1E1E2E" }}
        >
          Close
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1E1E2E" }}>
              <th
                className="px-4 py-2.5 text-left w-32"
                style={{ color: "#6B7280", fontSize: "10px", textTransform: "uppercase" }}
              >
                Metric
              </th>
              {creators.map((c) => (
                <th key={c.id} className="px-4 py-2.5 text-center" style={{ minWidth: "140px" }}>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold" style={{ color: "#E8EAF0" }}>
                        @{c.handle}
                      </span>
                      <button
                        onClick={() => onRemove(c.id)}
                        className="text-[10px] w-4 h-4 rounded flex items-center justify-center"
                        style={{ color: "#6B7280", border: "1px solid #1E1E2E" }}
                      >
                        ×
                      </button>
                    </div>
                    <LsTierBadge
                      tier={(c.lsTier ?? c.conversion.inferredLsTier ?? "LS0") as import("@/types/creator").LSTier}
                      size="sm"
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Score bars */}
            <tr style={{ borderBottom: "1px solid #1E1E2E" }}>
              <td className="px-4 py-2.5">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "#6B7280" }}>
                  Score Overview
                </span>
              </td>
              {creators.map((c) => (
                <td key={c.id} className="px-4 py-2.5">
                  <div className="space-y-1.5">
                    <ScoreBar
                      value={c.composite.total}
                      label="Composite"
                      height={4}
                      showValue
                      animate
                    />
                    <ScoreBar
                      value={c.branding.total}
                      label="Branding"
                      height={3}
                      showValue
                      color="#00D4FF"
                      animate
                    />
                    <ScoreBar
                      value={c.conversion.total}
                      label="Conversion"
                      height={3}
                      showValue
                      color="#F59E0B"
                      animate
                    />
                  </div>
                </td>
              ))}
            </tr>

            {/* Metric rows */}
            {METRICS.map((metric) => {
              const winner = getWinner(metric);
              return (
                <tr
                  key={metric.label}
                  style={{ borderBottom: "1px solid #1E1E2E" }}
                >
                  <td className="px-4 py-2 text-[10px] uppercase tracking-wider" style={{ color: "#6B7280" }}>
                    {metric.label}
                  </td>
                  {creators.map((c) => {
                    const val = metric.getValue(c);
                    const isWinner = winner === c.id;
                    return (
                      <td key={c.id} className="px-4 py-2 text-center">
                        <span
                          className="text-xs font-mono font-semibold"
                          style={{
                            color: isWinner ? "#00D4FF" : "#9CA3AF",
                          }}
                        >
                          {isWinner && <span className="mr-0.5">★</span>}
                          {metric.format(val)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Tags row */}
            <tr>
              <td className="px-4 py-2 text-[10px] uppercase tracking-wider" style={{ color: "#6B7280" }}>
                Tags
              </td>
              {creators.map((c) => (
                <td key={c.id} className="px-4 py-2">
                  <div className="flex flex-wrap justify-center gap-1">
                    {c.tags.length > 0
                      ? c.tags.map((tag) => (
                          <RecommendationBadge key={tag} tag={tag} size="sm" />
                        ))
                      : <span className="text-xs" style={{ color: "#6B7280" }}>—</span>
                    }
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
