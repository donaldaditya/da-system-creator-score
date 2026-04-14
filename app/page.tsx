"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { WeightSlider } from "@/components/WeightSlider";
import { useCreatorStore } from "@/store/creator-store";
import { CampaignObjective, Category, Platform } from "@/types/creator";
import type { Creator, ScoredCreator } from "@/types/creator";
import { parseCsvFile } from "@/lib/parsers/csv";
import { parseExcelFile } from "@/lib/parsers/excel";

const CATEGORY_OPTIONS = [
  { value: Category.Beauty, label: "Beauty" },
  { value: Category.Fashion, label: "Fashion" },
  { value: Category.Food, label: "Food" },
  { value: Category.Lifestyle, label: "Lifestyle" },
  { value: Category.Gaming, label: "Gaming" },
  { value: Category.Finance, label: "Finance" },
  { value: Category.Health, label: "Health" },
  { value: Category.Travel, label: "Travel" },
  { value: Category.Tech, label: "Tech" },
  { value: Category.Entertainment, label: "Entertainment" },
];

// ─── Cross-platform merge ─────────────────────────────────────────────────────

function mergeCreators(existing: Creator[], incoming: Creator[]): Creator[] {
  const byHandle = new Map<string, Creator>();

  for (const c of existing) {
    byHandle.set(c.handle.toLowerCase(), c);
  }

  for (const c of incoming) {
    const key = c.handle.toLowerCase();
    const prev = byHandle.get(key);
    if (!prev) {
      byHandle.set(key, c);
      continue;
    }

    // Merge: take all non-null fields, sum GMV across platforms
    const merged: Creator = {
      ...prev,
      ...Object.fromEntries(
        Object.entries(c).filter(([, v]) => v != null && v !== undefined)
      ),
      id: prev.id, // keep original id
      platform: prev.platform, // keep primary platform
      // Sum platform-specific GMV
      tiktokGmv30d: prev.tiktokGmv30d ?? c.tiktokGmv30d,
      shopeeGmv30d: prev.shopeeGmv30d ?? c.shopeeGmv30d,
      // Cross-platform total GMV
      gmv30d: (prev.gmv30d ?? 0) + (c.gmv30d ?? 0) || undefined,
      // Merge sources
      sources: [...new Set([...(prev.sources ?? [prev.platform]), ...(c.sources ?? [c.platform])])],
    };

    byHandle.set(key, merged);
  }

  return Array.from(byHandle.values());
}

// ─── Mapping preview ──────────────────────────────────────────────────────────

interface MappingPreview {
  fileName: string;
  fileType: "branding" | "affiliate" | "shopee" | "auto";
  creators: Creator[];
  isPartnerCenter?: boolean;
  isShopee?: boolean;
  totalRows?: number;
  matchedColumns?: Record<string, string>;
}

// ─── File drop zone ───────────────────────────────────────────────────────────

function DropZone({
  label,
  hint,
  icon,
  onFile,
  accentColor,
}: {
  label: string;
  hint: string;
  icon: string;
  onFile: (f: File) => void;
  accentColor: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onClick={() => ref.current?.click()}
      className="flex flex-col items-center gap-2 p-5 rounded-xl cursor-pointer transition-all text-center"
      style={{
        border: `2px dashed ${dragging ? accentColor : "#1E1E2E"}`,
        backgroundColor: dragging ? `${accentColor}08` : "#0D0D14",
        minHeight: "120px",
        justifyContent: "center",
      }}
    >
      <input ref={ref} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-semibold" style={{ color: "#E8EAF0" }}>{label}</span>
      <span className="text-[11px]" style={{ color: "#6B7280" }}>{hint}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const {
    brandingWeight, conversionWeight, campaignObjective, targetCategories,
    setCampaignObjective, setTargetCategories, setWeights, setScoredCreators,
    setIsScoring, setScoringError, isScoring, scoringError,
  } = useCreatorStore();

  const [creators, setCreators] = useState<Creator[]>([]);
  const [handleInput, setHandleInput] = useState("");
  const [fetchPlatform, setFetchPlatform] = useState<"tiktok" | "instagram">("tiktok");
  const [isFetching, setIsFetching] = useState(false);
  const [previews, setPreviews] = useState<MappingPreview[]>([]);
  const [pendingPreview, setPendingPreview] = useState<MappingPreview | null>(null);
  const [parseStatus, setParseStatus] = useState<Record<string, string>>({});

  // ── File processing ───────────────────────────────────────────────────────

  const processFile = async (file: File, fileType: MappingPreview["fileType"]) => {
    const key = file.name;
    setParseStatus((p) => ({ ...p, [key]: "parsing" }));

    try {
      const isExcel = /\.(xlsx?|xls)$/i.test(file.name);
      const result = isExcel ? await parseExcelFile(file) : await parseCsvFile(file);

      if (result.creators.length === 0) {
        setParseStatus((p) => ({ ...p, [key]: "error" }));
        return;
      }

      const preview: MappingPreview = {
        fileName: file.name,
        fileType,
        creators: result.creators,
        isPartnerCenter: result.isPartnerCenter,
        totalRows: result.partnerCenterMeta?.totalRows,
        matchedColumns: result.partnerCenterMeta?.detectedColumns,
      };

      setParseStatus((p) => ({ ...p, [key]: "ready" }));
      setPendingPreview(preview);
    } catch {
      setParseStatus((p) => ({ ...p, [key]: "error" }));
    }
  };

  const confirmPreview = (preview: MappingPreview) => {
    setCreators((prev) => mergeCreators(prev, preview.creators));
    setPreviews((prev) => [...prev, preview]);
    setPendingPreview(null);
  };

  // ── Auto-fetch handles ────────────────────────────────────────────────────

  const handleFetch = async () => {
    const handles = handleInput.split(",").map((h) => h.trim().replace(/^@/, "")).filter(Boolean);
    if (!handles.length) return;

    setIsFetching(true);
    try {
      const res = await fetch("/api/fetch-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles, platform: fetchPlatform }),
      });
      const data = await res.json();
      if (data.profiles) {
        const fetched: Creator[] = data.profiles.map((p: Record<string, unknown>, i: number) => ({
          id: `fetch-${i}-${Date.now()}`,
          handle: String(p.handle),
          platform: fetchPlatform === "instagram" ? Platform.Instagram : Platform.TikTok,
          followers: p.followers as number | undefined,
          avgViews: p.avgViews as number | undefined,
          engagementRate: p.engagementRate as number | undefined,
          postsLast30d: p.postsLast30d as number | undefined,
          avatarUrl: p.avatarUrl as string | undefined,
          sources: [fetchPlatform === "instagram" ? Platform.Instagram : Platform.TikTok],
        }));
        setCreators((prev) => mergeCreators(prev, fetched));
        setHandleInput("");
      }
    } catch { /* silently ignore */ }
    setIsFetching(false);
  };

  // ── Score ─────────────────────────────────────────────────────────────────

  const handleScore = async () => {
    if (!creators.length) return;
    setIsScoring(true);
    setScoringError(null);

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creators, brandingWeight, conversionWeight }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Scoring failed");
      }

      const data = await res.json();
      setScoredCreators(data.scored as ScoredCreator[]);
      router.push("/results");
    } catch (err) {
      setScoringError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsScoring(false);
    }
  };

  const showWeightSlider = campaignObjective === CampaignObjective.Both;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0F", color: "#E8EAF0" }}>
      {/* Header */}
      <header className="border-b px-6 py-4" style={{ borderColor: "#1E1E2E", backgroundColor: "#0D0D14" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Creator ROI Scorer</h1>
            <p className="text-xs" style={{ color: "#6B7280" }}>Data-driven creator scoring for affiliate campaigns</p>
          </div>
          <span className="text-[10px] px-2 py-1 rounded font-mono" style={{ backgroundColor: "rgba(0,212,255,0.1)", color: "#00D4FF", border: "1px solid rgba(0,212,255,0.2)" }}>v0.2</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold">Score & Rank Creators</h2>
          <p className="text-sm mt-1" style={{ color: "#6B7280" }}>Upload creator data from any platform, set campaign parameters, get instant ROI scores.</p>
        </div>

        {/* Campaign Setup */}
        <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: "#12121A", border: "1px solid #1E1E2E" }}>
          <h3 className="text-sm font-semibold">Campaign Setup</h3>

          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: "#6B7280" }}>Campaign Objective</label>
            <div className="flex gap-2">
              {([
                { value: CampaignObjective.Branding,   label: "Branding",   desc: "Awareness & reach" },
                { value: CampaignObjective.Conversion, label: "Conversion", desc: "Sales & GMV" },
                { value: CampaignObjective.Both,       label: "Both",       desc: "Balanced" },
              ] as const).map((opt) => (
                <button key={opt.value} onClick={() => setCampaignObjective(opt.value)}
                  className="flex-1 flex flex-col items-center gap-0.5 px-3 py-3 rounded-lg transition-all text-center"
                  style={{ backgroundColor: campaignObjective === opt.value ? "rgba(0,212,255,0.12)" : "rgba(18,18,26,0.6)", border: `1px solid ${campaignObjective === opt.value ? "rgba(0,212,255,0.4)" : "#1E1E2E"}` }}>
                  <span className="text-sm font-semibold" style={{ color: campaignObjective === opt.value ? "#00D4FF" : "#E8EAF0" }}>{opt.label}</span>
                  <span className="text-[10px]" style={{ color: "#6B7280" }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: "#6B7280" }}>Target Categories <span style={{ color: "#374151" }}>(optional)</span></label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map((opt) => {
                const selected = targetCategories.includes(opt.value);
                return (
                  <button key={opt.value} onClick={() => setTargetCategories(selected ? targetCategories.filter((c) => c !== opt.value) : [...targetCategories, opt.value])}
                    className="px-2.5 py-1 rounded text-xs font-medium transition-all"
                    style={{ backgroundColor: selected ? "rgba(0,212,255,0.12)" : "rgba(30,30,46,0.5)", color: selected ? "#00D4FF" : "#9CA3AF", border: `1px solid ${selected ? "rgba(0,212,255,0.35)" : "#1E1E2E"}` }}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {showWeightSlider && <WeightSlider brandingWeight={brandingWeight} onChange={setWeights} />}

        {/* ── Creator Data — 3 zones ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Creator Data</h3>

          {/* Zone 1: Auto-fetch by handle */}
          <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#12121A", border: "1px solid #1E1E2E" }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#00D4FF" }}>1 — Auto-Fetch by Handle</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(0,212,255,0.08)", color: "#00D4FF", border: "1px solid rgba(0,212,255,0.2)" }}>RapidAPI</span>
            </div>
            <div className="flex gap-2">
              <div className="flex rounded overflow-hidden shrink-0" style={{ border: "1px solid #1E1E2E" }}>
                {(["tiktok", "instagram"] as const).map((p) => (
                  <button key={p} onClick={() => setFetchPlatform(p)} className="px-3 py-2 text-xs capitalize transition-colors"
                    style={{ backgroundColor: fetchPlatform === p ? "rgba(0,212,255,0.1)" : "transparent", color: fetchPlatform === p ? "#00D4FF" : "#6B7280" }}>
                    {p === "tiktok" ? "TikTok" : "Instagram"}
                  </button>
                ))}
              </div>
              <input type="text" value={handleInput} onChange={(e) => setHandleInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                placeholder="@handle1, @handle2, @handle3"
                className="flex-1 rounded-lg text-sm font-mono"
                style={{ backgroundColor: "#0A0A0F", border: "1px solid #1E1E2E", color: "#E8EAF0", padding: "8px 12px", outline: "none" }} />
              <button onClick={handleFetch} disabled={!handleInput.trim() || isFetching}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                style={{ backgroundColor: "#00D4FF", color: "#0A0A0F" }}>
                {isFetching ? "Fetching…" : "Fetch"}
              </button>
            </div>
            <p className="text-[10px]" style={{ color: "#4B5563" }}>Requires RAPIDAPI_KEY env variable. Fetches followers, engagement rate, post frequency.</p>
          </div>

          {/* Zone 2: Branding CSV */}
          <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#12121A", border: "1px solid #1E1E2E" }}>
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#00D4FF" }}>2 — Upload Branding CSV</span>
            <p className="text-[11px]" style={{ color: "#6B7280" }}>TikTok One for Partners export — followers, engagement rate, posts/30d</p>
            <DropZone label="Drop Branding CSV / Excel" hint="TikTok ONE for Partners · Kalodata · any creator list" icon="📊" accentColor="#00D4FF"
              onFile={(f) => processFile(f, "branding")} />
          </div>

          {/* Zone 3: Affiliate / Commerce CSV */}
          <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#12121A", border: "1px solid #1E1E2E" }}>
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#F59E0B" }}>3 — Upload Affiliate Orders CSV</span>
            <p className="text-[11px]" style={{ color: "#6B7280" }}>TikTok Partner Center (schema A or B auto-detected) or Shopee ConversionReport_*.csv</p>
            <DropZone label="Drop Affiliate Orders / Shopee Report" hint="TikTok Partner Center · Shopee ConversionReport" icon="🛒" accentColor="#F59E0B"
              onFile={(f) => processFile(f, "affiliate")} />
          </div>
        </div>

        {/* ── Pending mapping preview ── */}
        {pendingPreview && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.3)", backgroundColor: "rgba(0,212,255,0.04)" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(0,212,255,0.15)" }}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold" style={{ color: "#00D4FF" }}>📋 Mapping Preview</span>
                <span className="text-xs" style={{ color: "#6B7280" }}>{pendingPreview.fileName}</span>
                {pendingPreview.isPartnerCenter && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(99,102,241,0.15)", color: "#818CF8", border: "1px solid rgba(99,102,241,0.3)" }}>
                    TikTok Partner Center · {pendingPreview.totalRows} rows → {pendingPreview.creators.length} creators
                  </span>
                )}
              </div>
              <button onClick={() => setPendingPreview(null)} className="text-xs" style={{ color: "#6B7280" }}>Discard</button>
            </div>

            <div className="px-4 py-3 space-y-2">
              {/* Show top 5 creators */}
              <div className="space-y-1">
                {pendingPreview.creators.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 text-xs py-1" style={{ borderBottom: "1px solid #1E1E2E" }}>
                    <span className="font-mono px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: "rgba(107,114,128,0.15)", color: "#9CA3AF" }}>
                      {c.platform.toUpperCase().slice(0, 2)}
                    </span>
                    <span style={{ color: "#E8EAF0" }}>@{c.handle}</span>
                    {c.gmv30d && <span style={{ color: "#F59E0B" }}>GMV: {c.gmv30d.toLocaleString()}</span>}
                    {c.followers && <span style={{ color: "#00D4FF" }}>{(c.followers / 1000).toFixed(0)}K followers</span>}
                    {c.engagementRate && <span style={{ color: "#10B981" }}>ER {c.engagementRate}%</span>}
                  </div>
                ))}
                {pendingPreview.creators.length > 5 && (
                  <p className="text-[11px] pt-1" style={{ color: "#6B7280" }}>...and {pendingPreview.creators.length - 5} more creators</p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => confirmPreview(pendingPreview)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: "#00D4FF", color: "#0A0A0F" }}>
                  ✓ Confirm & Add {pendingPreview.creators.length} Creators
                </button>
                <button onClick={() => setPendingPreview(null)} className="px-4 py-2 rounded-lg text-sm"
                  style={{ border: "1px solid #1E1E2E", color: "#6B7280" }}>
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Queued creators list ── */}
        {creators.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1E1E2E" }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid #1E1E2E", backgroundColor: "#0D0D14" }}>
              <span className="text-xs font-semibold">Queued Creators ({creators.length})</span>
              <button onClick={() => setCreators([])} className="text-[10px]" style={{ color: "#EF4444" }}>Clear all</button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {creators.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-2 text-xs" style={{ borderBottom: "1px solid #1E1E2E" }}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: "rgba(107,114,128,0.15)", color: "#9CA3AF" }}>
                      {c.platform.toUpperCase().slice(0, 2)}
                    </span>
                    <span>@{c.handle}</span>
                    {c.sources && c.sources.length > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
                        {c.sources.length} sources
                      </span>
                    )}
                    {c.gmv30d && <span style={{ color: "#F59E0B" }}>GMV: {c.gmv30d.toLocaleString()}</span>}
                    {c.followers && <span style={{ color: "#6B7280" }}>{(c.followers / 1000).toFixed(0)}K</span>}
                  </div>
                  <button onClick={() => setCreators((p) => p.filter((x) => x.id !== c.id))}
                    className="w-4 h-4 flex items-center justify-center text-[10px]" style={{ color: "#6B7280" }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {scoringError && (
          <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
            {scoringError}
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={handleScore} disabled={creators.length === 0 || isScoring}
            className="px-8 py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#00D4FF", color: "#0A0A0F" }}>
            {isScoring ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Scoring {creators.length} creators…
              </span>
            ) : `Score ${creators.length > 0 ? creators.length : ""} Creator${creators.length !== 1 ? "s" : ""} →`}
          </button>
        </div>
      </main>
    </div>
  );
}
