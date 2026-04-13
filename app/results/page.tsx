"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreatorStore } from "@/store/creator-store";
import { CreatorTable } from "@/components/CreatorTable";
import { FilterPanel } from "@/components/FilterPanel";
import { WeightSlider } from "@/components/WeightSlider";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { RecommendationBadgeList } from "@/components/ui/RecommendationBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { LsTierBadge } from "@/components/ui/LsTierBadge";
import type { ScoredCreator } from "@/types/creator";

type PanelView = "detail" | "comparison";

export default function ResultsPage() {
  const router = useRouter();
  const {
    scoredCreators,
    filters,
    brandingWeight,
    conversionWeight,
    viewMode,
    selectedCreatorId,
    selectedForComparison,
    setFilters,
    resetFilters,
    setViewMode,
    setSelectedCreator,
    toggleComparison,
    clearComparison,
    setWeights,
    getFilteredCreators,
  } = useCreatorStore();

  const [panelView, setPanelView] = useState<PanelView>("detail");
  const [isExporting, setIsExporting] = useState(false);

  const filtered = getFilteredCreators();
  const selectedCreator = scoredCreators.find((c) => c.id === selectedCreatorId) ?? null;
  const comparisonCreators = scoredCreators.filter((c) =>
    selectedForComparison.includes(c.id)
  );

  if (scoredCreators.length === 0) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#0A0A0F" }}
      >
        <div className="text-center space-y-4">
          <p className="text-lg" style={{ color: "#6B7280" }}>
            No scored creators found.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: "#00D4FF", color: "#0A0A0F" }}
          >
            ← Back to Scorer
          </button>
        </div>
      </div>
    );
  }

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoredCreators }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `creator-scores-${Date.now()}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setIsExporting(false);
    }
  };

  const topCreator = filtered[0] ?? scoredCreators[0];
  const avgScore =
    filtered.length > 0
      ? Math.round(
          filtered.reduce((sum, c) => sum + c.composite.total, 0) / filtered.length
        )
      : 0;

  const showSidePanel =
    (selectedCreator && panelView === "detail") ||
    (comparisonCreators.length >= 2 && panelView === "comparison");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#0A0A0F", color: "#E8EAF0" }}
    >
      {/* Header */}
      <header
        className="border-b px-6 py-3 flex items-center justify-between shrink-0"
        style={{ borderColor: "#1E1E2E", backgroundColor: "#0D0D14" }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="text-xs transition-colors"
            style={{ color: "#6B7280" }}
          >
            ← Back
          </button>
          <h1 className="text-sm font-bold" style={{ color: "#E8EAF0" }}>
            Results
          </h1>
          <span
            className="text-[10px] px-2 py-0.5 rounded font-mono"
            style={{
              backgroundColor: "rgba(0, 212, 255, 0.1)",
              color: "#00D4FF",
              border: "1px solid rgba(0, 212, 255, 0.2)",
            }}
          >
            {scoredCreators.length} creators scored
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div
            className="flex rounded overflow-hidden"
            style={{ border: "1px solid #1E1E2E" }}
          >
            {(["table", "card"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-1.5 text-[10px] uppercase tracking-wider transition-colors"
                style={{
                  backgroundColor: viewMode === mode ? "rgba(0, 212, 255, 0.1)" : "transparent",
                  color: viewMode === mode ? "#00D4FF" : "#6B7280",
                }}
              >
                {mode === "table" ? "⊞ Table" : "⊟ Cards"}
              </button>
            ))}
          </div>

          {/* Comparison toggle */}
          {selectedForComparison.length > 0 && (
            <button
              onClick={() => setPanelView("comparison")}
              className="px-3 py-1.5 rounded text-[10px] font-medium transition-colors"
              style={{
                backgroundColor: "rgba(167, 139, 250, 0.1)",
                color: "#A78BFA",
                border: "1px solid rgba(167, 139, 250, 0.25)",
              }}
            >
              Compare ({selectedForComparison.length})
            </button>
          )}

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-3 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-50"
            style={{
              backgroundColor: "rgba(0, 212, 255, 0.1)",
              color: "#00D4FF",
              border: "1px solid rgba(0, 212, 255, 0.25)",
            }}
          >
            {isExporting ? "Exporting..." : "↓ Export XLSX"}
          </button>
        </div>
      </header>

      {/* Summary bar */}
      <div
        className="px-6 py-3 flex items-center gap-6 border-b shrink-0"
        style={{ borderColor: "#1E1E2E", backgroundColor: "#0A0A0F" }}
      >
        <StatChip label="Showing" value={String(filtered.length)} unit={`/ ${scoredCreators.length}`} />
        <StatChip label="Avg Score" value={String(avgScore)} />
        {topCreator && (
          <StatChip label="Top Creator" value={`@${topCreator.handle}`} colored />
        )}
        <div className="flex-1" />
        {/* Inline weight slider */}
        <div className="w-64">
          <WeightSlider brandingWeight={brandingWeight} onChange={setWeights} />
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Filter sidebar */}
        <div
          className="shrink-0 overflow-y-auto p-4"
          style={{ width: "230px", borderRight: "1px solid #1E1E2E" }}
        >
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            onReset={resetFilters}
            totalCount={scoredCreators.length}
            filteredCount={filtered.length}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-4">
          {showSidePanel && panelView === "comparison" ? (
            <ComparisonPanel
              creators={comparisonCreators}
              onRemove={toggleComparison}
              onClose={() => {
                clearComparison();
                setPanelView("detail");
              }}
            />
          ) : viewMode === "table" ? (
            <CreatorTable
              creators={filtered}
              onSelectCreator={(c: ScoredCreator) => {
                setSelectedCreator(c.id);
                setPanelView("detail");
              }}
              selectedId={selectedCreatorId}
              onToggleComparison={toggleComparison}
              comparisonIds={selectedForComparison}
            />
          ) : (
            <CardGrid
              creators={filtered}
              onSelect={(c: ScoredCreator) => {
                setSelectedCreator(c.id);
                setPanelView("detail");
              }}
              selectedId={selectedCreatorId}
            />
          )}
        </div>

        {/* Detail panel */}
        {selectedCreator && panelView === "detail" && (
          <DetailPanel
            creator={selectedCreator}
            onClose={() => setSelectedCreator(null)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  unit,
  colored,
}: {
  label: string;
  value: string;
  unit?: string;
  colored?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wider" style={{ color: "#6B7280" }}>
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className="text-sm font-bold font-mono"
          style={{ color: colored ? "#00D4FF" : "#E8EAF0" }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[10px]" style={{ color: "#6B7280" }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function CardGrid({
  creators,
  onSelect,
  selectedId,
}: {
  creators: ScoredCreator[];
  onSelect: (c: ScoredCreator) => void;
  selectedId?: string | null;
}) {
  if (creators.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm" style={{ color: "#6B7280" }}>
          No creators match current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
      {creators.map((c) => {
        const tier = (c.lsTier ?? c.conversion.inferredLsTier ?? "LS0") as import("@/types/creator").LSTier;
        const isSelected = c.id === selectedId;

        return (
          <div
            key={c.id}
            onClick={() => onSelect(c)}
            className="rounded-xl p-4 cursor-pointer transition-all space-y-3"
            style={{
              backgroundColor: isSelected ? "rgba(0, 212, 255, 0.08)" : "#12121A",
              border: `1px solid ${isSelected ? "rgba(0, 212, 255, 0.4)" : "#1E1E2E"}`,
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = "#1A1A28";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = "#12121A";
              }
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: "#E8EAF0" }}>
                  @{c.handle}
                </p>
                <p className="text-xs capitalize" style={{ color: "#6B7280" }}>
                  {c.platform} · {c.category || "general"}
                </p>
              </div>
              <LsTierBadge tier={tier} size="sm" />
            </div>

            <div className="space-y-2">
              <ScoreBar
                value={c.composite.total}
                label="Composite"
                height={4}
                showValue
                color={c.composite.total >= 75 ? "#00D4FF" : c.composite.total >= 50 ? "#10B981" : "#F59E0B"}
              />
              <div className="grid grid-cols-2 gap-2">
                <ScoreBar
                  value={c.branding.total}
                  label="Branding"
                  height={3}
                  showValue
                  color="#00D4FF"
                />
                <ScoreBar
                  value={c.conversion.total}
                  label="Conv."
                  height={3}
                  showValue
                  color="#F59E0B"
                />
              </div>
            </div>

            {c.tags.length > 0 && (
              <RecommendationBadgeList tags={c.tags} max={2} size="sm" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DetailPanel({
  creator,
  onClose,
}: {
  creator: ScoredCreator;
  onClose: () => void;
}) {
  const tier = (creator.lsTier ?? creator.conversion.inferredLsTier ?? "LS0") as import("@/types/creator").LSTier;

  function fmt(n?: number, prefix = ""): string {
    if (n == null) return "—";
    if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`;
    return `${prefix}${n.toLocaleString()}`;
  }

  return (
    <div
      className="w-80 shrink-0 overflow-y-auto slide-in-right"
      style={{ borderLeft: "1px solid #1E1E2E", backgroundColor: "#0D0D14" }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between p-4"
        style={{ borderBottom: "1px solid #1E1E2E" }}
      >
        <div>
          <h3 className="text-base font-bold" style={{ color: "#E8EAF0" }}>
            @{creator.handle}
          </h3>
          <p className="text-xs capitalize" style={{ color: "#6B7280" }}>
            {creator.platform} · {creator.category || "general"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LsTierBadge tier={tier} size="md" showLabel />
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-xs"
            style={{ color: "#6B7280", border: "1px solid #1E1E2E" }}
          >
            ×
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Composite score */}
        <div className="space-y-2">
          <ScoreBar
            value={creator.composite.total}
            label="Composite Score"
            height={6}
            showValue
            animate
          />
          <div className="grid grid-cols-2 gap-2">
            <ScoreBar
              value={creator.branding.total}
              label="Branding"
              height={4}
              showValue
              color="#00D4FF"
              animate
            />
            <ScoreBar
              value={creator.conversion.total}
              label="Conversion"
              height={4}
              showValue
              color="#F59E0B"
              animate
            />
          </div>
        </div>

        {/* Tags */}
        {creator.tags.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#6B7280" }}>
              Tags
            </p>
            <RecommendationBadgeList tags={creator.tags} max={7} size="md" />
          </div>
        )}

        {/* Branding breakdown */}
        <div>
          <p
            className="text-[10px] uppercase tracking-wider mb-2 px-2 py-1 rounded"
            style={{
              color: "#00D4FF",
              backgroundColor: "rgba(0, 212, 255, 0.08)",
              border: "1px solid rgba(0, 212, 255, 0.15)",
            }}
          >
            Branding Signals
          </p>
          <div className="space-y-2">
            {creator.branding.signals.engagementRate && (
              <SignalRow
                label="Engagement Rate"
                value={`${creator.branding.signals.engagementRate.rawValue?.toFixed(1)}%`}
                score={creator.branding.signals.engagementRate.normalizedScore}
                color="#00D4FF"
              />
            )}
            {creator.branding.signals.viewToFollower && (
              <SignalRow
                label="View / Follower"
                value={`${((creator.branding.signals.viewToFollower.rawValue ?? 0) * 100).toFixed(0)}%`}
                score={creator.branding.signals.viewToFollower.normalizedScore}
                color="#00D4FF"
              />
            )}
            {creator.branding.signals.followerBase && (
              <SignalRow
                label="Followers"
                value={fmt(creator.followers)}
                score={creator.branding.signals.followerBase.normalizedScore}
                color="#00D4FF"
              />
            )}
            {creator.branding.signals.contentConsistency && (
              <SignalRow
                label="Consistency"
                value={creator.contentConsistency ?? "—"}
                score={creator.branding.signals.contentConsistency.normalizedScore}
                color="#00D4FF"
              />
            )}
            {creator.branding.signals.nicheAlignment && (
              <SignalRow
                label="Niche Alignment"
                value={creator.nicheFocus ?? String(creator.nicheAlignment ?? "—")}
                score={creator.branding.signals.nicheAlignment.normalizedScore}
                color="#00D4FF"
              />
            )}
          </div>
        </div>

        {/* Conversion breakdown */}
        <div>
          <p
            className="text-[10px] uppercase tracking-wider mb-2 px-2 py-1 rounded"
            style={{
              color: "#F59E0B",
              backgroundColor: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.15)",
            }}
          >
            Conversion Signals
          </p>
          <div className="space-y-2">
            {creator.conversion.signals.lsTier && (
              <SignalRow
                label="LS Tier"
                value={tier}
                score={creator.conversion.signals.lsTier.normalizedScore}
                color="#F59E0B"
              />
            )}
            {creator.conversion.signals.gmvTrend && (
              <SignalRow
                label="GMV Trend"
                value={`${(creator.conversion.signals.gmvTrend.rawValue ?? 1).toFixed(2)}×`}
                score={creator.conversion.signals.gmvTrend.normalizedScore}
                color="#F59E0B"
              />
            )}
            {creator.conversion.signals.gmvPerLivestream && (
              <SignalRow
                label="GMV / Live"
                value={fmt(creator.conversion.signals.gmvPerLivestream.rawValue ?? undefined, "$")}
                score={creator.conversion.signals.gmvPerLivestream.normalizedScore}
                color="#F59E0B"
              />
            )}
            {creator.conversion.signals.svEfficiency && (
              <SignalRow
                label="SV Efficiency"
                value={`${(creator.conversion.signals.svEfficiency.rawValue ?? 0).toFixed(1)}%`}
                score={creator.conversion.signals.svEfficiency.normalizedScore}
                color="#F59E0B"
              />
            )}
            {creator.conversion.signals.livestreamFrequency && (
              <SignalRow
                label="LS Frequency"
                value={`${creator.conversion.signals.livestreamFrequency.rawValue ?? 0} / mo`}
                score={creator.conversion.signals.livestreamFrequency.normalizedScore}
                color="#F59E0B"
              />
            )}
          </div>
        </div>

        {/* Raw stats */}
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#6B7280" }}>
            Raw Data
          </p>
          <div className="grid grid-cols-2 gap-1">
            <DataPoint label="GMV 30d" value={fmt(creator.gmv30d, "$")} />
            <DataPoint label="GMV 60d" value={fmt(creator.gmv60d, "$")} />
            <DataPoint label="GMV 90d" value={fmt(creator.gmv90d, "$")} />
            <DataPoint label="Lives 30d" value={fmt(creator.livestreamsLast30d)} />
            <DataPoint label="Avg GMV/Live" value={fmt(creator.avgGmvPerLivestream, "$")} />
            <DataPoint label="Shop Videos" value={fmt(creator.shopVideoCount)} />
          </div>
        </div>

        {/* Data completeness */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "#6B7280" }}>
            Data Completeness
          </p>
          <ScoreBar
            value={Math.round(creator.branding.dataCompleteness * 100)}
            label="Branding data"
            height={3}
            showValue
            color="#00D4FF"
            animate={false}
          />
          <ScoreBar
            value={Math.round(creator.conversion.dataCompleteness * 100)}
            label="Conversion data"
            height={3}
            showValue
            color="#F59E0B"
            animate={false}
          />
        </div>
      </div>
    </div>
  );
}

function SignalRow({
  label,
  value,
  score,
  color,
}: {
  label: string;
  value: string;
  score: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-28 shrink-0" style={{ color: "#9CA3AF" }}>
        {label}
      </span>
      <span className="text-[10px] font-mono w-10 text-right shrink-0" style={{ color }}>
        {Math.round(score)}
      </span>
      <div className="flex-1">
        <ScoreBar value={score} height={2} showValue={false} color={color} animate={false} />
      </div>
      <span className="text-[10px] font-mono w-12 text-right shrink-0" style={{ color: "#6B7280" }}>
        {value}
      </span>
    </div>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded px-2 py-1.5"
      style={{ backgroundColor: "rgba(30, 30, 46, 0.5)", border: "1px solid #1E1E2E" }}
    >
      <p className="text-[9px] uppercase tracking-wider" style={{ color: "#6B7280" }}>
        {label}
      </p>
      <p className="text-xs font-mono font-semibold" style={{ color: "#E8EAF0" }}>
        {value}
      </p>
    </div>
  );
}
