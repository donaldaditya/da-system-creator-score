"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCreatorStore } from "@/store/creator-store";
import { WeightSlider } from "@/components/WeightSlider";
import type { ScoredCreator, SignalScore, ScoreBadge } from "@/types/creator";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 70) return "#10B981"; // green
  if (score >= 40) return "#F59E0B"; // amber
  return "#EF4444";                   // red
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

function badgeStyle(badge: ScoreBadge): { bg: string; color: string; border: string } {
  switch (badge) {
    case "Full Score":     return { bg: "rgba(16,185,129,0.12)", color: "#10B981", border: "rgba(16,185,129,0.3)" };
    case "Branding Only":  return { bg: "rgba(0,212,255,0.12)",  color: "#00D4FF", border: "rgba(0,212,255,0.3)"  };
    case "Commerce Only":  return { bg: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "rgba(245,158,11,0.3)" };
    default:               return { bg: "rgba(107,114,128,0.12)",color: "#6B7280", border: "rgba(107,114,128,0.3)"};
  }
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

// ─── Creator Card ─────────────────────────────────────────────────────────────

function CreatorCard({ creator, onClick, selected }: { creator: ScoredCreator; onClick: () => void; selected: boolean }) {
  const col = scoreColor(creator.composite.total);
  const bs  = badgeStyle(creator.composite.badge);

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
        {/* Overall score */}
        <div className="flex flex-col items-end">
          <span className="text-2xl font-black" style={{ color: col, lineHeight: 1 }}>{creator.composite.total}</span>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: "#6B7280" }}>overall</span>
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
      <div className="space-y-2 mb-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px]" style={{ color: "#00D4FF" }}>Branding <ScoreTooltip signals={creator.branding.signals} label="Branding" /></span>
            <span className="text-[10px] font-mono font-bold" style={{ color: "#00D4FF" }}>{creator.branding.total}</span>
          </div>
          <MiniBar value={creator.branding.total} color="#00D4FF" />
          <div className="flex gap-2 mt-1">
            {(["engagement", "posting", "reach"] as const).map((k) => {
              const s = creator.branding.signals[k];
              if (!s) return null;
              const labels: Record<string, string> = { engagement: "ER", posting: "Posts", reach: "Reach" };
              return (
                <span key={k} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(0,212,255,0.08)", color: "#00D4FF" }}>
                  {labels[k]} {Math.round(s.normalizedScore)}
                </span>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px]" style={{ color: "#F59E0B" }}>Commerce <ScoreTooltip signals={creator.conversion.signals} label="Commerce" /></span>
            <span className="text-[10px] font-mono font-bold" style={{ color: "#F59E0B" }}>{creator.conversion.total}</span>
          </div>
          <MiniBar value={creator.conversion.total} color="#F59E0B" />
          <div className="flex gap-2 mt-1">
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
              <div>
                <span style={{ color: "#6B7280" }}>TikTok</span>
                <p className="font-mono" style={{ color: "#E8EAF0" }}>{fmtIDR(creator.tiktokGmv30d)}</p>
              </div>
              <div>
                <span style={{ color: "#6B7280" }}>Shopee</span>
                <p className="font-mono" style={{ color: "#E8EAF0" }}>{fmtIDR(creator.shopeeGmv30d)}</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <span style={{ color: "#6B7280" }}>Orders</span>
                <p className="font-mono" style={{ color: "#E8EAF0" }}>{fmtNum(creator.orders30d)}</p>
              </div>
              <div>
                <span style={{ color: "#6B7280" }}>Avg Order</span>
                <p className="font-mono" style={{ color: "#E8EAF0" }}>{fmtIDR(creator.avgOrderValue)}</p>
              </div>
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
    </div>
  );
}

// ─── Results page ─────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const router = useRouter();
  const { scoredCreators, brandingWeight, setWeights, getFilteredCreators } = useCreatorStore();
  const [sort, setSort] = useState<"overall" | "branding" | "commerce" | "gmv">("overall");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
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
    if (sort === "branding")  return b.branding.total  - a.branding.total;
    if (sort === "commerce")  return b.conversion.total - a.conversion.total;
    if (sort === "gmv")       return (b.gmv30d ?? 0) - (a.gmv30d ?? 0);
    return b.composite.total - a.composite.total;
  });

  const avgScore = Math.round(scoredCreators.reduce((s, c) => s + c.composite.total, 0) / scoredCreators.length);
  const topCreator = sorted[0];
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
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `creator-scores-${Date.now()}.xlsx`; a.click();
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
        doc.setFontSize(18);
        doc.setTextColor(30, 30, 30);
        doc.text(`@${creator.handle}`, M, 25);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`${creator.platform} · ${creator.category ?? "general"} · ${creator.composite.badge}`, M, 32);

        // Scores
        let y = 45;
        doc.setFontSize(28);
        const col = creator.composite.total >= 70 ? [16, 185, 129] : creator.composite.total >= 40 ? [245, 158, 11] : [239, 68, 68];
        doc.setTextColor(col[0], col[1], col[2]);
        doc.text(String(creator.composite.total), M, y);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Overall Score", M + 18, y);

        y += 12;
        doc.setFontSize(12);
        doc.setTextColor(0, 212, 255);
        doc.text(`Branding: ${creator.branding.total}`, M, y);
        doc.setTextColor(245, 158, 11);
        doc.text(`Commerce: ${creator.conversion.total}`, M + 45, y);

        // GMV breakdown
        if (creator.gmv30d) {
          y += 14;
          doc.setFontSize(10);
          doc.setTextColor(30, 30, 30);
          doc.text("Commerce", M, y);
          y += lineH;
          doc.setTextColor(100, 100, 100);
          doc.text(`Total GMV (30d): ${fmtIDR(creator.gmv30d)}`, M + 4, y);
          if (creator.tiktokGmv30d) { y += lineH; doc.text(`TikTok GMV: ${fmtIDR(creator.tiktokGmv30d)}`, M + 4, y); }
          if (creator.shopeeGmv30d) { y += lineH; doc.text(`Shopee GMV: ${fmtIDR(creator.shopeeGmv30d)}`, M + 4, y); }
          if (creator.orders30d) { y += lineH; doc.text(`Orders: ${creator.orders30d}`, M + 4, y); }
          if (creator.topContentType) { y += lineH; doc.text(`Top channel: ${creator.topContentType}`, M + 4, y); }
        }

        // Platform badges
        if (creator.sources?.length) {
          y += 14;
          doc.setFontSize(9);
          doc.setTextColor(80, 80, 80);
          doc.text("Platforms: " + creator.sources.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" · "), M, y);
        }

        // Footer
        const footerY = 282;
        doc.setDrawColor(200, 200, 200);
        doc.line(M, footerY - 4, W - M, footerY - 4);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Created by Donald Aditya | Contact for full creator analytics", W / 2, footerY, { align: "center" });
        doc.text(today, W - M, footerY, { align: "right" });
      });

      doc.save(`creator-roi-${Date.now()}.pdf`);
    } catch (e) {
      console.error("PDF export error:", e);
    }
    setIsPdfExporting(false);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0A0A0F", color: "#E8EAF0" }}>
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
      <div className="px-6 py-3 flex items-center gap-6 border-b shrink-0"
        style={{ borderColor: "#1E1E2E" }}>
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
