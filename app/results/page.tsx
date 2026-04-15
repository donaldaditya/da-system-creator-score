"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCreatorStore } from "@/store/creator-store";
import { WeightSlider } from "@/components/WeightSlider";
import type { ScoredCreator, SignalScore, ScoreBadge } from "@/types/creator";

// ─── Benchmark constants (Indonesia creator market averages) ──────────────────

const BENCHMARKS = {
  engagementRate: 8,         // % — Indonesia TikTok average
  postFrequency:  12,        // posts/month
  followerMidMin: 100_000,   // mid-tier floor
  followerMidMax: 500_000,   // mid-tier ceiling
  gmvIDR:         240_000_000, // IDR 240M/month — LS5 entry threshold ($15K USD)
  ctr:            3,         // %
  ctor:           7,         // %
} as const;

// ─── Score label ──────────────────────────────────────────────────────────────

function scoreLabelInfo(score: number): { label: string; color: string } {
  if (score >= 85) return { label: "Elite",            color: "#10B981" };
  if (score >= 70) return { label: "Strong",           color: "#34D399" };
  if (score >= 50) return { label: "Developing",       color: "#F59E0B" };
  if (score >= 30) return { label: "Weak",             color: "#F97316" };
  return              { label: "Not recommended",   color: "#EF4444" };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 70) return "#10B981";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function fmtIDR(n?: number): string {
  if (n == null) return "—";
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `Rp ${Math.round(n / 1_000)}K`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function fmtNum(n?: number): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
}

function fmtPct(n?: number | null): string {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}

function badgeStyle(badge: ScoreBadge): { bg: string; color: string; border: string } {
  switch (badge) {
    case "Full Score":     return { bg: "rgba(16,185,129,0.12)",  color: "#10B981", border: "rgba(16,185,129,0.3)"  };
    case "Branding Only":  return { bg: "rgba(0,212,255,0.12)",   color: "#00D4FF", border: "rgba(0,212,255,0.3)"   };
    case "Commerce Only":  return { bg: "rgba(245,158,11,0.12)",  color: "#F59E0B", border: "rgba(245,158,11,0.3)"  };
    default:               return { bg: "rgba(107,114,128,0.12)", color: "#6B7280", border: "rgba(107,114,128,0.3)" };
  }
}

// ─── Benchmark comparison line ────────────────────────────────────────────────

interface BenchmarkResult { text: string; color: string }

function benchmarkLine(
  rawValue: number | null | undefined,
  benchmark: number,
  metricLabel: string,
  formatVal: (v: number) => string,
  formatBench: (v: number) => string = formatVal,
): BenchmarkResult | null {
  if (rawValue == null) return null;
  const ratio   = rawValue / benchmark;
  const multiple = ratio.toFixed(1);
  const dir      = ratio >= 1 ? "above" : "below";
  const color    = ratio >= 1 ? "#10B981" : ratio >= 0.5 ? "#F59E0B" : "#EF4444";
  return {
    text:  `${metricLabel} ${formatVal(rawValue)} — ${multiple}× ${dir} benchmark (${formatBench(benchmark)})`,
    color,
  };
}

function followerBenchmark(followers?: number): BenchmarkResult | null {
  if (followers == null) return null;
  if (followers >= BENCHMARKS.followerMidMax) {
    const mult = (followers / BENCHMARKS.followerMidMax).toFixed(1);
    return { text: `Reach ${fmtNum(followers)} — ${mult}× above mid-tier ceiling (${fmtNum(BENCHMARKS.followerMidMax)})`, color: "#10B981" };
  }
  if (followers >= BENCHMARKS.followerMidMin) {
    return { text: `Reach ${fmtNum(followers)} — within mid-tier (${fmtNum(BENCHMARKS.followerMidMin)}–${fmtNum(BENCHMARKS.followerMidMax)})`, color: "#34D399" };
  }
  const ratio = followers / BENCHMARKS.followerMidMin;
  const color = ratio >= 0.5 ? "#F59E0B" : "#EF4444";
  return { text: `Reach ${fmtNum(followers)} — below mid-tier floor (${fmtNum(BENCHMARKS.followerMidMin)})`, color };
}

// ─── Auto-generated analysis paragraph ───────────────────────────────────────

const SIGNAL_NAMES: Record<string, string> = {
  engagement: "Engagement Rate",
  posting:    "Post Frequency",
  reach:      "Reach",
  gmv:        "GMV",
  ctr:        "CTR",
  ctor:       "CTOR",
};

function generateAnalysis(creator: ScoredCreator): string {
  const overall = creator.composite.total;
  const { label } = scoreLabelInfo(overall);
  const handle = `@${creator.handle}`;

  // Highest branding sub-dim
  const brandingEntries = (["engagement", "posting", "reach"] as const)
    .map((k) => ({ k, s: creator.branding.signals[k] }))
    .filter((x) => x.s != null)
    .sort((a, b) => (b.s?.normalizedScore ?? 0) - (a.s?.normalizedScore ?? 0));
  const topBranding = brandingEntries[0];

  // All present signals sorted by normalizedScore asc (lowest first)
  const allSignals = [
    ...["engagement", "posting", "reach"].map((k) => ({ k, s: (creator.branding.signals as Record<string, SignalScore | null | undefined>)[k] })),
    ...["gmv", "ctr", "ctor"].map((k) => ({ k, s: (creator.conversion.signals as Record<string, SignalScore | null | undefined>)[k] })),
  ].filter((x) => x.s != null).sort((a, b) => (a.s?.normalizedScore ?? 0) - (b.s?.normalizedScore ?? 0));
  const lowestSignal = allSignals[0];

  const platforms = creator.sources?.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" + ") ?? creator.platform;
  const gmvText  = creator.gmv30d ? fmtIDR(creator.gmv30d) : "no tracked GMV";

  // CTOR text + direction
  let ctorRaw: number | undefined;
  if (creator.ctor != null) ctorRaw = creator.ctor;
  else if (creator.orders30d != null && creator.clicks30d != null && creator.clicks30d > 0)
    ctorRaw = (creator.orders30d / creator.clicks30d) * 100;
  const ctorText  = ctorRaw != null ? `${ctorRaw.toFixed(1)}%` : "unavailable";
  const ctorAbove = ctorRaw != null ? ctorRaw >= BENCHMARKS.ctor : null;

  // Top branding dim value text
  let topBrandingStr = "";
  if (topBranding) {
    const raw = topBranding.s?.rawValue;
    if (topBranding.k === "engagement") topBrandingStr = ` at ${raw != null ? `${raw}%` : "—"}`;
    else if (topBranding.k === "posting") topBrandingStr = ` at ${raw != null ? `${raw} posts/mo` : "—"}`;
    else if (topBranding.k === "reach") topBrandingStr = ` at ${raw != null ? fmtNum(raw) + " followers" : "—"}`;

    // vs benchmark
    const benchmarkVals: Record<string, number> = { engagement: BENCHMARKS.engagementRate, posting: BENCHMARKS.postFrequency };
    const bench = benchmarkVals[topBranding.k];
    if (bench && raw != null) {
      const above = raw >= bench;
      topBrandingStr += `, ${above ? "above" : "below"} the Indonesia benchmark`;
    } else {
      topBrandingStr += ", within Indonesia mid-tier";
    }
  }

  let para = `${handle} scores ${overall}/100 overall (${label}). `;
  para += topBranding
    ? `Branding strength is led by ${SIGNAL_NAMES[topBranding.k]}${topBrandingStr}. `
    : `Branding data is incomplete — auto-fetch or upload a branding CSV for a full signal set. `;
  para += `Commerce performance shows ${gmvText} in tracked GMV across ${platforms}`;
  para += ctorRaw != null
    ? `, with CTOR at ${ctorText} — ${ctorAbove ? "above" : "below"} typical affiliate range. `
    : ` (no click data available for CTOR calculation). `;
  if (lowestSignal) {
    para += `Key risk: ${SIGNAL_NAMES[lowestSignal.k] ?? lowestSignal.k} at ${Math.round(lowestSignal.s?.normalizedScore ?? 0)}/100 is the primary drag on overall score.`;
  }

  return para;
}

// ─── Score Tooltip ────────────────────────────────────────────────────────────

function ScoreTooltip({ signals, label }: { signals: Record<string, SignalScore | null | undefined>; label: string }) {
  const [visible, setVisible] = useState(false);
  const entries = Object.entries(signals).filter(([, v]) => v != null) as [string, SignalScore][];
  return (
    <div className="relative inline-block" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      <span className="cursor-help underline decoration-dotted" style={{ color: "#6B7280", fontSize: "10px" }}>ⓘ</span>
      {visible && entries.length > 0 && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
          backgroundColor: "#12121A", border: "1px solid #2E2E40", borderRadius: "8px",
          padding: "10px 12px", minWidth: "220px", zIndex: 100,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}>
          <p className="text-[10px] font-bold mb-2 uppercase tracking-wider" style={{ color: "#E8EAF0" }}>{label} Breakdown</p>
          {entries.map(([key, sig]) => (
            <div key={key} className="flex items-center justify-between gap-2 mb-1 text-[10px]">
              <span style={{ color: "#9CA3AF" }}>{sig.label ?? key}</span>
              <span style={{ color: "#6B7280" }}>×{(sig.weight * 100).toFixed(0)}%</span>
              <span className="font-mono" style={{ color: "#E8EAF0" }}>
                {sig.rawValue != null ? sig.rawValue.toLocaleString() : "—"}
              </span>
              <span className="font-mono font-bold" style={{ color: "#00D4FF" }}>{Math.round(sig.normalizedScore)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: "4px", borderRadius: "2px", backgroundColor: "#1E1E2E", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: "100%", backgroundColor: color, borderRadius: "2px", transition: "width 0.6s ease" }} />
    </div>
  );
}

// ─── Benchmark Context Modal ──────────────────────────────────────────────────

function BenchmarkModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(10,10,15,0.85)", backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        backgroundColor: "#12121A", border: "1px solid #1E1E2E", borderRadius: "16px",
        padding: "32px", width: "100%", maxWidth: "560px", maxHeight: "85vh",
        overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
      }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold">Scoring Methodology</h2>
          <button onClick={onClose} style={{ color: "#6B7280", fontSize: "18px", lineHeight: 1 }}>×</button>
        </div>

        {/* Branding */}
        <div className="mb-5">
          <p className="text-xs font-bold mb-2" style={{ color: "#00D4FF" }}>📊 Branding Score (0–100)</p>
          <p className="text-[11px] mb-3" style={{ color: "#9CA3AF" }}>
            Measures a creator&apos;s ability to build audience awareness and sustained content presence.
            Weighted composite of three signals:
          </p>
          <div className="space-y-1.5">
            {[
              { name: "Engagement Rate", weight: "55%", desc: "% of followers who interact. Cap 20%. Indonesia avg 8%." },
              { name: "Post Frequency",  weight: "25%", desc: "Posts per 30 days. Cap 30. Benchmark 12/mo." },
              { name: "Reach",           weight: "20%", desc: "Total followers (log-normalized). Cap 5M. Mid-tier 100K–500K." },
            ].map((s) => (
              <div key={s.name} className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.1)" }}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-semibold" style={{ color: "#E8EAF0" }}>{s.name}</span>
                  <span className="text-[10px] font-mono" style={{ color: "#00D4FF" }}>{s.weight}</span>
                </div>
                <p className="text-[10px]" style={{ color: "#6B7280" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Commerce */}
        <div className="mb-5">
          <p className="text-xs font-bold mb-2" style={{ color: "#F59E0B" }}>🛒 Commerce Score (0–100)</p>
          <p className="text-[11px] mb-3" style={{ color: "#9CA3AF" }}>
            Measures a creator&apos;s ability to drive sales. Requires affiliate data from TikTok Partner
            Center or Shopee. Missing signals are redistributed by weight.
          </p>
          <div className="space-y-1.5">
            {[
              { name: "GMV (30d)",  weight: "35%", desc: `Total gross merchandise value in IDR. Cap IDR 500M. Benchmark IDR 240M/mo ($15K USD — LS5 threshold).` },
              { name: "CTR",        weight: "30%", desc: "Click-through rate on affiliate links. Cap 15%. Benchmark 3%." },
              { name: "CTOR",       weight: "35%", desc: "Click-to-order rate (orders ÷ clicks). Cap 30%. Benchmark 7%. Derived if orders + clicks present." },
            ].map((s) => (
              <div key={s.name} className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.1)" }}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-semibold" style={{ color: "#E8EAF0" }}>{s.name}</span>
                  <span className="text-[10px] font-mono" style={{ color: "#F59E0B" }}>{s.weight}</span>
                </div>
                <p className="text-[10px]" style={{ color: "#6B7280" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Overall */}
        <div className="mb-5">
          <p className="text-xs font-bold mb-2" style={{ color: "#E8EAF0" }}>⚡ Overall Score</p>
          <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
            Default: 50% Branding + 50% Commerce. Adjust with the weight slider on results page.
            Creators with only branding or commerce data receive a partial score and a &quot;Branding Only&quot;
            or &quot;Commerce Only&quot; badge — not directly comparable to Full Score creators.
          </p>
        </div>

        {/* Score labels */}
        <div className="mb-5">
          <p className="text-xs font-bold mb-2" style={{ color: "#E8EAF0" }}>🏷 Score Labels</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { range: "85–100", label: "Elite",            color: "#10B981" },
              { range: "70–84",  label: "Strong",           color: "#34D399" },
              { range: "50–69",  label: "Developing",       color: "#F59E0B" },
              { range: "30–49",  label: "Weak",             color: "#F97316" },
              { range: "0–29",   label: "Not recommended",  color: "#EF4444" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-[10px]">
                <span className="font-mono w-12" style={{ color: "#6B7280" }}>{s.range}</span>
                <span className="font-semibold" style={{ color: s.color }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Benchmarks */}
        <div className="mb-5 rounded-lg px-3 py-3" style={{ backgroundColor: "rgba(107,114,128,0.06)", border: "1px solid #1E1E2E" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#6B7280" }}>Benchmark Values</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
            {[
              ["Engagement Rate", "8%"],
              ["Post Frequency",  "12 posts/mo"],
              ["Follower Mid-tier", "100K–500K"],
              ["GMV (30d)",       "IDR 240M ($15K)"],
              ["CTR",             "3%"],
              ["CTOR",            "7%"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span style={{ color: "#9CA3AF" }}>{k}</span>
                <span className="font-mono" style={{ color: "#E8EAF0" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-center" style={{ color: "#4B5563" }}>
          Benchmarks reflect Indonesia creator market averages. Recalibrate for other markets.
        </p>
      </div>
    </div>
  );
}

// ─── Creator Card ─────────────────────────────────────────────────────────────

function CreatorCard({ creator, onClick, selected }: {
  creator: ScoredCreator;
  onClick: () => void;
  selected: boolean;
}) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const col  = scoreColor(creator.composite.total);
  const bs   = badgeStyle(creator.composite.badge);
  const { label: overallLabel, color: overallLabelColor } = scoreLabelInfo(creator.composite.total);
  const { label: brandingLabel, color: brandingLabelColor } = scoreLabelInfo(creator.branding.total);
  const { label: commerceLabel, color: commerceLabelColor } = scoreLabelInfo(creator.conversion.total);

  // Benchmark lines for each sub-signal
  const benchEngagement = benchmarkLine(
    creator.engagementRate,
    BENCHMARKS.engagementRate,
    "Engagement",
    (v) => `${v}%`,
  );
  const benchPosting = benchmarkLine(
    creator.postsLast30d,
    BENCHMARKS.postFrequency,
    "Post frequency",
    (v) => `${Math.round(v)} posts/mo`,
  );
  const benchReach = followerBenchmark(creator.followers);
  const benchGmv = benchmarkLine(
    creator.gmv30d,
    BENCHMARKS.gmvIDR,
    "GMV",
    fmtIDR,
  );
  const benchCtr = benchmarkLine(
    creator.ctr,
    BENCHMARKS.ctr,
    "CTR",
    (v) => `${v}%`,
  );
  // CTOR: use creator.ctor or derive
  let ctorRaw = creator.ctor ?? null;
  if (ctorRaw == null && creator.orders30d != null && creator.clicks30d != null && creator.clicks30d > 0)
    ctorRaw = (creator.orders30d / creator.clicks30d) * 100;
  const benchCtor = benchmarkLine(
    ctorRaw,
    BENCHMARKS.ctor,
    "CTOR",
    (v) => `${v.toFixed(1)}%`,
  );

  const analysis = generateAnalysis(creator);

  return (
    <div onClick={onClick} className="rounded-xl p-4 cursor-pointer transition-all"
      style={{ backgroundColor: selected ? "rgba(0,212,255,0.06)" : "#12121A", border: `1px solid ${selected ? "rgba(0,212,255,0.4)" : "#1E1E2E"}` }}>

      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {creator.avatarUrl ? (
            <img src={creator.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" style={{ border: "1px solid #1E1E2E" }} />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: "rgba(0,212,255,0.1)", color: "#00D4FF", border: "1px solid rgba(0,212,255,0.2)" }}>
              {creator.handle[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-bold">@{creator.handle}</p>
            <p className="text-[10px] capitalize" style={{ color: "#6B7280" }}>{creator.platform} · {creator.category ?? "general"}</p>
          </div>
        </div>
        {/* Overall score + label */}
        <div className="flex flex-col items-end">
          <span className="text-2xl font-black" style={{ color: col, lineHeight: 1 }}>{creator.composite.total}</span>
          <span className="text-[9px] font-semibold" style={{ color: overallLabelColor }}>{overallLabel}</span>
          <span className="text-[8px] uppercase tracking-wider" style={{ color: "#4B5563" }}>overall</span>
        </div>
      </div>

      {/* Badge */}
      <div className="mb-3">
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: bs.bg, color: bs.color, border: `1px solid ${bs.border}` }}>
          {creator.composite.badge}
        </span>
        {creator.sources && creator.sources.length > 1 && (
          <span className="ml-1.5 text-[10px] px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(16,185,129,0.08)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
            {creator.sources.map((s) => s.toUpperCase().slice(0, 2)).join(" + ")}
          </span>
        )}
      </div>

      {/* Score bars */}
      <div className="space-y-3 mb-3">

        {/* Branding */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px]" style={{ color: "#00D4FF" }}>
              Branding <ScoreTooltip signals={creator.branding.signals} label="Branding" />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold" style={{ color: brandingLabelColor }}>{brandingLabel}</span>
              <span className="text-[10px] font-mono font-bold" style={{ color: "#00D4FF" }}>{creator.branding.total}</span>
            </div>
          </div>
          <MiniBar value={creator.branding.total} color="#00D4FF" />
          <div className="flex gap-2 mt-1 flex-wrap">
            {(["engagement", "posting", "reach"] as const).map((k) => {
              const s = creator.branding.signals[k];
              if (!s) return null;
              const chipLabels: Record<string, string> = { engagement: "ER", posting: "Posts", reach: "Reach" };
              return (
                <span key={k} className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "rgba(0,212,255,0.08)", color: "#00D4FF" }}>
                  {chipLabels[k]} {Math.round(s.normalizedScore)}
                </span>
              );
            })}
          </div>
          {/* Benchmark lines */}
          <div className="mt-1.5 space-y-0.5">
            {[benchEngagement, benchPosting, benchReach].filter(Boolean).map((b, i) => (
              <p key={i} className="text-[9px]" style={{ color: b!.color }}>{b!.text}</p>
            ))}
          </div>
        </div>

        {/* Commerce */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px]" style={{ color: "#F59E0B" }}>
              Commerce <ScoreTooltip signals={creator.conversion.signals} label="Commerce" />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold" style={{ color: commerceLabelColor }}>{commerceLabel}</span>
              <span className="text-[10px] font-mono font-bold" style={{ color: "#F59E0B" }}>{creator.conversion.total}</span>
            </div>
          </div>
          <MiniBar value={creator.conversion.total} color="#F59E0B" />
          <div className="flex gap-2 mt-1 flex-wrap">
            {(["gmv", "ctr", "ctor"] as const).map((k) => {
              const s = (creator.conversion.signals as Record<string, SignalScore | null | undefined>)[k];
              const labels: Record<string, string> = { gmv: "GMV", ctr: "CTR", ctor: creator.conversion.ctorMissing ? "CTOR N/A" : "CTOR" };
              if (!s && k !== "ctor") return null;
              return (
                <span key={k} className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: s ? "rgba(245,158,11,0.08)" : "rgba(107,114,128,0.08)", color: s ? "#F59E0B" : "#6B7280" }}>
                  {labels[k]}{s ? ` ${Math.round(s.normalizedScore)}` : ""}
                </span>
              );
            })}
          </div>
          {/* Benchmark lines */}
          <div className="mt-1.5 space-y-0.5">
            {[benchGmv, benchCtr, benchCtor].filter(Boolean).map((b, i) => (
              <p key={i} className="text-[9px]" style={{ color: b!.color }}>{b!.text}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Commerce detail row */}
      {(creator.gmv30d || creator.orders30d) && (
        <div className="grid grid-cols-3 gap-1 text-[9px] mt-2 pt-2" style={{ borderTop: "1px solid #1E1E2E" }}>
          <div>
            <span style={{ color: "#6B7280" }}>Total GMV</span>
            <p className="font-mono font-bold" style={{ color: "#F59E0B" }}>{fmtIDR(creator.gmv30d)}</p>
          </div>
          {creator.tiktokGmv30d && creator.shopeeGmv30d ? (
            <>
              <div><span style={{ color: "#6B7280" }}>TikTok</span><p className="font-mono" style={{ color: "#E8EAF0" }}>{fmtIDR(creator.tiktokGmv30d)}</p></div>
              <div><span style={{ color: "#6B7280" }}>Shopee</span><p className="font-mono" style={{ color: "#E8EAF0" }}>{fmtIDR(creator.shopeeGmv30d)}</p></div>
            </>
          ) : (
            <>
              <div><span style={{ color: "#6B7280" }}>Orders</span><p className="font-mono" style={{ color: "#E8EAF0" }}>{fmtNum(creator.orders30d)}</p></div>
              <div><span style={{ color: "#6B7280" }}>Avg Order</span><p className="font-mono" style={{ color: "#E8EAF0" }}>{fmtIDR(creator.avgOrderValue)}</p></div>
            </>
          )}
        </div>
      )}

      {/* IG→Shopee conv rate */}
      {creator.instagramShopeeConvRate != null && (
        <div className="mt-2 px-2 py-1 rounded text-[10px]" style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <span style={{ color: "#6B7280" }}>IG→Shopee conv:</span>{" "}
          <span className="font-bold" style={{ color: "#F59E0B" }}>{creator.instagramShopeeConvRate.toFixed(1)}%</span>
        </div>
      )}

      {/* View Analysis toggle */}
      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setAnalysisOpen((v) => !v)}
          className="text-[10px] flex items-center gap-1 transition-colors"
          style={{ color: analysisOpen ? "#00D4FF" : "#4B5563" }}
        >
          <span>{analysisOpen ? "▾" : "▸"}</span>
          <span>{analysisOpen ? "Hide Analysis" : "View Analysis"}</span>
        </button>
        {analysisOpen && (
          <div className="mt-2 rounded-lg px-3 py-2.5 text-[11px] leading-relaxed"
            style={{ backgroundColor: "rgba(0,0,0,0.3)", border: "1px solid #1E1E2E", color: "#9CA3AF" }}>
            {analysis}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Results page ─────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const router = useRouter();
  const { scoredCreators, brandingWeight, setWeights } = useCreatorStore();
  const [sort, setSort] = useState<"overall" | "branding" | "commerce" | "gmv">("overall");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  if (scoredCreators.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0A0A0F" }}>
        <div className="text-center space-y-4">
          <p className="text-lg" style={{ color: "#6B7280" }}>No scored creators found.</p>
          <button onClick={() => router.push("/")} className="px-6 py-2 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: "#00D4FF", color: "#0A0A0F" }}>← Back to Scorer</button>
        </div>
      </div>
    );
  }

  const sorted = [...scoredCreators].sort((a, b) => {
    if (sort === "branding")  return b.branding.total   - a.branding.total;
    if (sort === "commerce")  return b.conversion.total - a.conversion.total;
    if (sort === "gmv")       return (b.gmv30d ?? 0)    - (a.gmv30d ?? 0);
    return b.composite.total - a.composite.total;
  });

  const avgScore      = Math.round(scoredCreators.reduce((s, c) => s + c.composite.total, 0) / scoredCreators.length);
  const topCreator    = sorted[0];
  const fullScoreCount = scoredCreators.filter((c) => c.composite.badge === "Full Score").length;

  const handleExportXlsx = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoredCreators }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a"); a.href = url; a.download = `creator-scores-${Date.now()}.xlsx`; a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* ignore */ }
    setIsExporting(false);
  };

  const handleExportPdf = async () => {
    setIsPdfExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210, M = 15, lineH = 6;
      const today = new Date().toLocaleDateString("en-GB");
      const watermarkEmail = "donald.aditya@gmail.com";

      sorted.forEach((creator, idx) => {
        if (idx > 0) doc.addPage();

        // Watermark
        doc.setTextColor(200, 200, 200);
        doc.setFontSize(32);
        doc.setGState(new (doc as unknown as { GState: new (o: unknown) => unknown }).GState({ opacity: 0.08 }));
        doc.text(watermarkEmail, W / 2, 148, { align: "center", angle: 30 });
        doc.setGState(new (doc as unknown as { GState: new (o: unknown) => unknown }).GState({ opacity: 1 }));

        // Header
        doc.setFontSize(18); doc.setTextColor(30, 30, 30);
        doc.text(`@${creator.handle}`, M, 25);
        doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        doc.text(`${creator.platform} · ${creator.category ?? "general"} · ${creator.composite.badge}`, M, 32);

        // Scores
        let y = 45;
        doc.setFontSize(28);
        const col = creator.composite.total >= 70 ? [16,185,129] : creator.composite.total >= 40 ? [245,158,11] : [239,68,68];
        doc.setTextColor(col[0], col[1], col[2]);
        doc.text(String(creator.composite.total), M, y);
        doc.setFontSize(10); doc.setTextColor(100,100,100);
        doc.text(`Overall — ${scoreLabelInfo(creator.composite.total).label}`, M + 18, y);

        y += 12;
        doc.setFontSize(12); doc.setTextColor(0, 212, 255);
        doc.text(`Branding: ${creator.branding.total} (${scoreLabelInfo(creator.branding.total).label})`, M, y);
        doc.setTextColor(245, 158, 11);
        doc.text(`Commerce: ${creator.conversion.total} (${scoreLabelInfo(creator.conversion.total).label})`, M + 65, y);

        // Analysis paragraph
        y += 14;
        doc.setFontSize(9); doc.setTextColor(60, 60, 60);
        const lines = doc.splitTextToSize(generateAnalysis(creator), W - M * 2);
        doc.text(lines, M, y);
        y += lines.length * 5;

        // GMV breakdown
        if (creator.gmv30d) {
          y += 8;
          doc.setFontSize(10); doc.setTextColor(30,30,30);
          doc.text("Commerce Detail", M, y); y += lineH;
          doc.setTextColor(100,100,100);
          doc.text(`Total GMV (30d): ${fmtIDR(creator.gmv30d)}`, M + 4, y);
          if (creator.tiktokGmv30d) { y += lineH; doc.text(`TikTok GMV: ${fmtIDR(creator.tiktokGmv30d)}`, M + 4, y); }
          if (creator.shopeeGmv30d) { y += lineH; doc.text(`Shopee GMV: ${fmtIDR(creator.shopeeGmv30d)}`, M + 4, y); }
          if (creator.orders30d)    { y += lineH; doc.text(`Orders: ${creator.orders30d}`, M + 4, y); }
        }

        // Platforms
        if (creator.sources?.length) {
          y += 12;
          doc.setFontSize(9); doc.setTextColor(80,80,80);
          doc.text("Platforms: " + creator.sources.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" · "), M, y);
        }

        // Footer
        const footerY = 282;
        doc.setDrawColor(200,200,200); doc.line(M, footerY - 4, W - M, footerY - 4);
        doc.setFontSize(8); doc.setTextColor(150,150,150);
        doc.text("DA System: Creator Score | www.da-system.ai", W / 2, footerY, { align: "center" });
        doc.text(today, W - M, footerY, { align: "right" });
      });

      doc.save(`da-system-creator-score-${Date.now()}.pdf`);
    } catch (e) { console.error("PDF export error:", e); }
    setIsPdfExporting(false);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0A0A0F", color: "#E8EAF0" }}>
      {showBenchmarkModal && <BenchmarkModal onClose={() => setShowBenchmarkModal(false)} />}

      {/* Header */}
      <header className="border-b px-6 py-3 flex items-center justify-between shrink-0"
        style={{ borderColor: "#1E1E2E", backgroundColor: "#0D0D14" }}>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/")} className="text-xs" style={{ color: "#6B7280" }}>← Back</button>
          <h1 className="text-sm font-bold">Results</h1>
          <span className="text-[10px] px-2 py-0.5 rounded font-mono"
            style={{ backgroundColor: "rgba(0,212,255,0.1)", color: "#00D4FF", border: "1px solid rgba(0,212,255,0.2)" }}>
            {scoredCreators.length} creators scored
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowBenchmarkModal(true)}
            className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors"
            style={{ backgroundColor: "rgba(107,114,128,0.12)", color: "#6B7280", border: "1px solid #1E1E2E" }}
            title="Scoring methodology">?</button>
          <button onClick={handleExportPdf} disabled={isPdfExporting}
            className="px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
            style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.25)" }}>
            {isPdfExporting ? "Exporting…" : "↓ Export PDF"}
          </button>
          <button onClick={handleExportXlsx} disabled={isExporting}
            className="px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
            style={{ backgroundColor: "rgba(0,212,255,0.1)", color: "#00D4FF", border: "1px solid rgba(0,212,255,0.25)" }}>
            {isExporting ? "Exporting…" : "↓ Export XLSX"}
          </button>
        </div>
      </header>

      {/* Summary bar */}
      <div className="px-6 py-3 flex items-center gap-6 border-b shrink-0" style={{ borderColor: "#1E1E2E" }}>
        <div>
          <p className="text-[9px] uppercase tracking-wider" style={{ color: "#6B7280" }}>Avg Score</p>
          <p className="text-sm font-bold font-mono" style={{ color: scoreColor(avgScore) }}>{avgScore}</p>
        </div>
        {topCreator && (
          <div>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: "#6B7280" }}>Top Creator</p>
            <p className="text-sm font-bold" style={{ color: "#00D4FF" }}>@{topCreator.handle}</p>
          </div>
        )}
        <div>
          <p className="text-[9px] uppercase tracking-wider" style={{ color: "#6B7280" }}>Full Score</p>
          <p className="text-sm font-bold" style={{ color: "#10B981" }}>{fullScoreCount} / {scoredCreators.length}</p>
        </div>
        <div className="flex-1" />
        {/* Sort toggles */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] mr-1" style={{ color: "#6B7280" }}>Sort:</span>
          {(["overall", "branding", "commerce", "gmv"] as const).map((s) => (
            <button key={s} onClick={() => setSort(s)}
              className="px-2.5 py-1 rounded text-[10px] font-medium capitalize transition-colors"
              style={{
                backgroundColor: sort === s ? "rgba(0,212,255,0.12)" : "transparent",
                color: sort === s ? "#00D4FF" : "#6B7280",
                border: `1px solid ${sort === s ? "rgba(0,212,255,0.3)" : "transparent"}`,
              }}>
              {s === "gmv" ? "GMV" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="w-52 shrink-0">
          <WeightSlider brandingWeight={brandingWeight} onChange={setWeights} />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4" ref={resultsRef}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-w-7xl mx-auto">
          {sorted.map((c) => (
            <CreatorCard key={c.id} creator={c} selected={c.id === selectedId}
              onClick={() => setSelectedId(c.id === selectedId ? null : c.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
