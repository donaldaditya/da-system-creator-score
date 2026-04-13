"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InputTabs } from "@/components/InputTabs";
import { WeightSlider } from "@/components/WeightSlider";
import { useCreatorStore } from "@/store/creator-store";
import { CampaignObjective, Category } from "@/types/creator";
import type { Creator, ScoredCreator } from "@/types/creator";

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

export default function HomePage() {
  const router = useRouter();
  const {
    brandingWeight,
    conversionWeight,
    campaignObjective,
    targetCategories,
    setCampaignObjective,
    setTargetCategories,
    setWeights,
    setScoredCreators,
    setIsScoring,
    setScoringError,
    isScoring,
    scoringError,
  } = useCreatorStore();

  const [creators, setCreators] = useState<Creator[]>([]);

  const handleCreatorsParsed = (newCreators: Creator[]) => {
    setCreators((prev) => {
      // Replace existing creators with the same handle (newer entry wins — has more data)
      const updated = [...prev];
      for (const newC of newCreators) {
        const existingIdx = updated.findIndex((c) => c.handle === newC.handle);
        if (existingIdx >= 0) {
          updated[existingIdx] = newC; // replace with fuller data
        } else {
          updated.push(newC);
        }
      }
      return updated;
    });
  };

  const handleRemoveCreator = (id: string) => {
    setCreators((prev) => prev.filter((c) => c.id !== id));
  };

  const handleScore = async () => {
    if (creators.length === 0) return;
    setIsScoring(true);
    setScoringError(null);

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creators,
          brandingWeight,
          conversionWeight,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Scoring failed");
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

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#0A0A0F", color: "#E8EAF0" }}
    >
      {/* Header */}
      <header
        className="border-b px-6 py-4"
        style={{ borderColor: "#1E1E2E", backgroundColor: "#0D0D14" }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: "#E8EAF0" }}>
              Creator ROI Scorer
            </h1>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Data-driven creator scoring for affiliate campaigns
            </p>
          </div>
          <div
            className="text-[10px] px-2 py-1 rounded font-mono"
            style={{
              backgroundColor: "rgba(0, 212, 255, 0.1)",
              color: "#00D4FF",
              border: "1px solid rgba(0, 212, 255, 0.2)",
            }}
          >
            v0.1
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold" style={{ color: "#E8EAF0" }}>
            Score & Rank Creators
          </h2>
          <p className="text-sm" style={{ color: "#6B7280" }}>
            Upload creator data, set campaign parameters, and get instant ROI scores with
            actionable recommendations.
          </p>
        </div>

        {/* Campaign Setup */}
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: "#12121A", border: "1px solid #1E1E2E" }}
        >
          <h3 className="text-sm font-semibold" style={{ color: "#E8EAF0" }}>
            Campaign Setup
          </h3>

          {/* Objective selector */}
          <div>
            <label
              className="block text-[10px] uppercase tracking-wider mb-2"
              style={{ color: "#6B7280" }}
            >
              Campaign Objective
            </label>
            <div className="flex gap-2">
              {(
                [
                  { value: CampaignObjective.Branding, label: "Branding", desc: "Awareness & reach" },
                  { value: CampaignObjective.Conversion, label: "Conversion", desc: "Sales & GMV" },
                  { value: CampaignObjective.Both, label: "Both", desc: "Balanced" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCampaignObjective(opt.value)}
                  className="flex-1 flex flex-col items-center gap-0.5 px-3 py-3 rounded-lg transition-all text-center"
                  style={{
                    backgroundColor:
                      campaignObjective === opt.value
                        ? "rgba(0, 212, 255, 0.12)"
                        : "rgba(18, 18, 26, 0.6)",
                    border: `1px solid ${campaignObjective === opt.value ? "rgba(0, 212, 255, 0.4)" : "#1E1E2E"}`,
                  }}
                >
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color: campaignObjective === opt.value ? "#00D4FF" : "#E8EAF0",
                    }}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[10px]" style={{ color: "#6B7280" }}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Category multi-select */}
          <div>
            <label
              className="block text-[10px] uppercase tracking-wider mb-2"
              style={{ color: "#6B7280" }}
            >
              Target Categories{" "}
              <span style={{ color: "#374151" }}>(optional)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map((opt) => {
                const selected = targetCategories.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      if (selected) {
                        setTargetCategories(
                          targetCategories.filter((c) => c !== opt.value)
                        );
                      } else {
                        setTargetCategories([...targetCategories, opt.value]);
                      }
                    }}
                    className="px-2.5 py-1 rounded text-xs font-medium transition-all"
                    style={{
                      backgroundColor: selected
                        ? "rgba(0, 212, 255, 0.12)"
                        : "rgba(30, 30, 46, 0.5)",
                      color: selected ? "#00D4FF" : "#9CA3AF",
                      border: `1px solid ${selected ? "rgba(0, 212, 255, 0.35)" : "#1E1E2E"}`,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Weight slider — only show for "Both" */}
        {showWeightSlider && (
          <WeightSlider
            brandingWeight={brandingWeight}
            onChange={setWeights}
          />
        )}

        {/* Creator Input */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold" style={{ color: "#E8EAF0" }}>
            Creator Data
          </h3>
          <InputTabs
            onCreatorsParsed={handleCreatorsParsed}
            creatorCount={creators.length}
          />
        </div>

        {/* Creator preview list */}
        {creators.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid #1E1E2E" }}
          >
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: "1px solid #1E1E2E", backgroundColor: "#0D0D14" }}
            >
              <span className="text-xs font-semibold" style={{ color: "#E8EAF0" }}>
                Queued Creators ({creators.length})
              </span>
              <button
                onClick={() => setCreators([])}
                className="text-[10px]"
                style={{ color: "#EF4444" }}
              >
                Clear all
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {creators.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-4 py-2 text-xs"
                  style={{ borderBottom: "1px solid #1E1E2E" }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono px-1.5 py-0.5 rounded text-[10px]"
                      style={{
                        backgroundColor: "rgba(107, 114, 128, 0.15)",
                        color: "#9CA3AF",
                      }}
                    >
                      {c.platform.toUpperCase().slice(0, 2)}
                    </span>
                    <span style={{ color: "#E8EAF0" }}>@{c.handle}</span>
                    {c.category && (
                      <span style={{ color: "#6B7280" }} className="capitalize">
                        · {c.category}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveCreator(c.id)}
                    className="w-4 h-4 flex items-center justify-center rounded text-[10px]"
                    style={{ color: "#6B7280" }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {scoringError && (
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#EF4444",
            }}
          >
            {scoringError}
          </div>
        )}

        {/* Score button */}
        <div className="flex justify-end">
          <button
            onClick={handleScore}
            disabled={creators.length === 0 || isScoring}
            className="px-8 py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "#00D4FF",
              color: "#0A0A0F",
            }}
          >
            {isScoring ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Scoring {creators.length} creators...
              </span>
            ) : (
              `Score ${creators.length > 0 ? creators.length : ""} Creator${creators.length !== 1 ? "s" : ""} →`
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
