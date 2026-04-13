"use client";

import { useState } from "react";
import type { ScoredCreator } from "@/types/creator";
import { LsTierBadge } from "@/components/ui/LsTierBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { RecommendationBadgeList } from "@/components/ui/RecommendationBadge";

interface CreatorTableProps {
  creators: ScoredCreator[];
  onSelectCreator: (creator: ScoredCreator) => void;
  selectedId?: string | null;
  onToggleComparison?: (id: string) => void;
  comparisonIds?: string[];
}

type SortField = "composite" | "branding" | "conversion" | "followers" | "gmv";
type SortDir = "asc" | "desc";

const PLATFORM_ICON: Record<string, string> = {
  tiktok: "TK",
  instagram: "IG",
  shopee: "SH",
};

function formatFollowers(n?: number): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatGmv(n?: number): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const COL_HEADER = "text-[10px] uppercase tracking-wider font-medium cursor-pointer select-none transition-colors hover:text-white";

export function CreatorTable({
  creators,
  onSelectCreator,
  selectedId,
  onToggleComparison,
  comparisonIds = [],
}: CreatorTableProps) {
  const [sortField, setSortField] = useState<SortField>("composite");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sorted = [...creators].sort((a, b) => {
    let av = 0;
    let bv = 0;
    switch (sortField) {
      case "composite":
        av = a.composite.total;
        bv = b.composite.total;
        break;
      case "branding":
        av = a.branding.total;
        bv = b.branding.total;
        break;
      case "conversion":
        av = a.conversion.total;
        bv = b.conversion.total;
        break;
      case "followers":
        av = a.followers ?? 0;
        bv = b.followers ?? 0;
        break;
      case "gmv":
        av = a.gmv30d ?? 0;
        bv = b.gmv30d ?? 0;
        break;
    }
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const sortArrow = (field: SortField) =>
    sortField === field ? (sortDir === "desc" ? " ↓" : " ↑") : "";

  const rowRankClass = (rank: number | undefined) => {
    if (rank === 1) return "top-rank-1";
    if (rank === 2) return "top-rank-2";
    if (rank === 3) return "top-rank-3";
    return "";
  };

  if (creators.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl"
        style={{
          minHeight: "200px",
          backgroundColor: "#12121A",
          border: "1px solid #1E1E2E",
        }}
      >
        <p className="text-sm" style={{ color: "#6B7280" }}>
          No creators to display. Apply filters or upload data.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid #1E1E2E" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1E1E2E", backgroundColor: "#0D0D14" }}>
              <th className="w-8 px-3 py-2.5 text-left" style={{ color: "#6B7280" }}>
                <span className="text-[10px] uppercase tracking-wider">#</span>
              </th>
              <th className="px-3 py-2.5 text-left min-w-[140px]" style={{ color: "#6B7280" }}>
                <span className={COL_HEADER}>Creator</span>
              </th>
              <th className="px-3 py-2.5 text-left w-16" style={{ color: "#6B7280" }}>
                <span className={COL_HEADER}>Plat.</span>
              </th>
              <th className="px-3 py-2.5 text-left w-24" style={{ color: "#6B7280" }}>
                <span className={COL_HEADER}>Category</span>
              </th>
              <th className="px-3 py-2.5 text-left w-16" style={{ color: "#6B7280" }}>
                <span className={COL_HEADER}>Tier</span>
              </th>
              <th
                className="px-3 py-2.5 text-left w-28"
                style={{ color: "#6B7280" }}
                onClick={() => handleSort("branding")}
              >
                <span className={COL_HEADER} style={{ color: sortField === "branding" ? "#00D4FF" : "#6B7280" }}>
                  Branding{sortArrow("branding")}
                </span>
              </th>
              <th
                className="px-3 py-2.5 text-left w-28"
                style={{ color: "#6B7280" }}
                onClick={() => handleSort("conversion")}
              >
                <span className={COL_HEADER} style={{ color: sortField === "conversion" ? "#00D4FF" : "#6B7280" }}>
                  Conversion{sortArrow("conversion")}
                </span>
              </th>
              <th
                className="px-3 py-2.5 text-left w-28"
                style={{ color: "#6B7280" }}
                onClick={() => handleSort("composite")}
              >
                <span className={COL_HEADER} style={{ color: sortField === "composite" ? "#00D4FF" : "#6B7280" }}>
                  Composite{sortArrow("composite")}
                </span>
              </th>
              <th
                className="px-3 py-2.5 text-right w-20"
                style={{ color: "#6B7280" }}
                onClick={() => handleSort("followers")}
              >
                <span className={COL_HEADER} style={{ color: sortField === "followers" ? "#00D4FF" : "#6B7280" }}>
                  Followers{sortArrow("followers")}
                </span>
              </th>
              <th
                className="px-3 py-2.5 text-right w-20"
                style={{ color: "#6B7280" }}
                onClick={() => handleSort("gmv")}
              >
                <span className={COL_HEADER} style={{ color: sortField === "gmv" ? "#00D4FF" : "#6B7280" }}>
                  GMV 30d{sortArrow("gmv")}
                </span>
              </th>
              <th className="px-3 py-2.5 text-left min-w-[160px]" style={{ color: "#6B7280" }}>
                <span className={COL_HEADER}>Tags</span>
              </th>
              <th className="px-3 py-2.5 w-16" style={{ color: "#6B7280" }}>
                <span className="text-[10px] uppercase tracking-wider">Add</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((creator, idx) => {
              const tier =
                creator.lsTier ?? creator.conversion.inferredLsTier ?? "LS0";
              const isSelected = creator.id === selectedId;
              const isInComparison = comparisonIds.includes(creator.id);

              return (
                <tr
                  key={creator.id}
                  onClick={() => onSelectCreator(creator)}
                  className={`cursor-pointer transition-colors ${rowRankClass(creator.rank)}`}
                  style={{
                    borderBottom: "1px solid #1E1E2E",
                    backgroundColor: isSelected
                      ? "rgba(0, 212, 255, 0.08)"
                      : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                        "rgba(26, 26, 40, 0.8)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "";
                    }
                  }}
                >
                  {/* Rank */}
                  <td className="px-3 py-2.5">
                    <span
                      className="text-xs font-mono"
                      style={{
                        color: idx < 3 ? "#00D4FF" : "#6B7280",
                        fontWeight: idx < 3 ? 700 : 400,
                      }}
                    >
                      {idx + 1}
                    </span>
                  </td>

                  {/* Handle */}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium" style={{ color: "#E8EAF0" }}>
                        @{creator.handle}
                      </span>
                    </div>
                  </td>

                  {/* Platform */}
                  <td className="px-3 py-2.5">
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: "rgba(107, 114, 128, 0.15)",
                        color: "#9CA3AF",
                        border: "1px solid rgba(107, 114, 128, 0.2)",
                      }}
                    >
                      {PLATFORM_ICON[creator.platform] || creator.platform.toUpperCase().slice(0, 2)}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="px-3 py-2.5">
                    <span className="text-xs capitalize" style={{ color: "#9CA3AF" }}>
                      {creator.category || "—"}
                    </span>
                  </td>

                  {/* LS Tier */}
                  <td className="px-3 py-2.5">
                    <LsTierBadge tier={tier as import("@/types/creator").LSTier} size="sm" />
                  </td>

                  {/* Branding score */}
                  <td className="px-3 py-2.5 w-28">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-mono font-semibold w-6 text-right shrink-0"
                        style={{ color: "#00D4FF" }}
                      >
                        {creator.branding.total}
                      </span>
                      <div className="flex-1">
                        <ScoreBar
                          value={creator.branding.total}
                          height={3}
                          showValue={false}
                          color="#00D4FF"
                        />
                      </div>
                    </div>
                  </td>

                  {/* Conversion score */}
                  <td className="px-3 py-2.5 w-28">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-mono font-semibold w-6 text-right shrink-0"
                        style={{ color: "#F59E0B" }}
                      >
                        {creator.conversion.total}
                      </span>
                      <div className="flex-1">
                        <ScoreBar
                          value={creator.conversion.total}
                          height={3}
                          showValue={false}
                          color="#F59E0B"
                        />
                      </div>
                    </div>
                  </td>

                  {/* Composite score */}
                  <td className="px-3 py-2.5 w-28">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-mono font-bold w-6 text-right shrink-0"
                        style={{ color: "#E8EAF0" }}
                      >
                        {creator.composite.total}
                      </span>
                      <div className="flex-1">
                        <ScoreBar
                          value={creator.composite.total}
                          height={3}
                          showValue={false}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Followers */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs font-mono" style={{ color: "#9CA3AF" }}>
                      {formatFollowers(creator.followers)}
                    </span>
                  </td>

                  {/* GMV */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs font-mono" style={{ color: "#9CA3AF" }}>
                      {formatGmv(creator.gmv30d)}
                    </span>
                  </td>

                  {/* Tags */}
                  <td className="px-3 py-2.5">
                    <RecommendationBadgeList tags={creator.tags} max={2} size="sm" />
                  </td>

                  {/* Compare toggle */}
                  <td className="px-3 py-2.5 text-center">
                    {onToggleComparison && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComparison(creator.id);
                        }}
                        className="w-6 h-6 rounded flex items-center justify-center text-xs transition-colors"
                        style={{
                          backgroundColor: isInComparison
                            ? "rgba(0, 212, 255, 0.2)"
                            : "rgba(107, 114, 128, 0.1)",
                          color: isInComparison ? "#00D4FF" : "#6B7280",
                          border: `1px solid ${isInComparison ? "rgba(0, 212, 255, 0.4)" : "#1E1E2E"}`,
                        }}
                        title={isInComparison ? "Remove from comparison" : "Add to comparison"}
                      >
                        {isInComparison ? "✓" : "+"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
