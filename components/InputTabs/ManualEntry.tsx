"use client";

import { useState, useEffect } from "react";
import {
  Platform,
  Category,
  ContentConsistencyLevel,
  NicheFocusLevel,
} from "@/types/creator";
import type { Creator } from "@/types/creator";

interface ManualEntryProps {
  onParsed: (creators: Creator[]) => void;
  prefillHandle?: string;
  prefillPlatform?: Platform;
}

interface FormData {
  handle: string;
  platform: Platform;
  category: string;
  // Branding
  followers: string;
  avgViews: string;
  engagementRate: string;
  postingFrequency: string;
  contentConsistency: string;
  nicheFocus: string;
  // Conversion
  gmv30d: string;
  gmv60d: string;
  gmv90d: string;
  livestreamsLast30d: string;
  avgGmvPerLivestream: string;
  shopVideoCount: string;
  svConversionRate: string;
}

const EMPTY_FORM: FormData = {
  handle: "",
  platform: Platform.TikTok,
  category: "",
  followers: "",
  avgViews: "",
  engagementRate: "",
  postingFrequency: "",
  contentConsistency: "",
  nicheFocus: "",
  gmv30d: "",
  gmv60d: "",
  gmv90d: "",
  livestreamsLast30d: "",
  avgGmvPerLivestream: "",
  shopVideoCount: "",
  svConversionRate: "",
};

const PLATFORM_OPTIONS = [
  { value: Platform.TikTok, label: "TikTok" },
  { value: Platform.Instagram, label: "Instagram" },
  { value: Platform.Shopee, label: "Shopee" },
];

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
  { value: Category.Other, label: "Other" },
];

function parseNum(val: string): number | undefined {
  const n = parseFloat(val.replace(/[$,]/g, ""));
  return isNaN(n) ? undefined : n;
}

function inputStyle(hasError = false): React.CSSProperties {
  return {
    backgroundColor: "#0A0A0F",
    border: `1px solid ${hasError ? "#EF4444" : "#1E1E2E"}`,
    color: "#E8EAF0",
    borderRadius: "6px",
    padding: "6px 10px",
    fontSize: "13px",
    width: "100%",
    outline: "none",
  };
}

function labelStyle(): React.CSSProperties {
  return {
    fontSize: "11px",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "4px",
    display: "block",
  };
}

export function ManualEntry({ onParsed, prefillHandle, prefillPlatform }: ManualEntryProps) {
  const [form, setForm] = useState<FormData>({
    ...EMPTY_FORM,
    handle: prefillHandle ?? "",
    platform: prefillPlatform ?? Platform.TikTok,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [dataMode, setDataMode] = useState<"branding" | "conversion" | "both">("both");

  // When a new handle is pre-filled from URL paste, update handle + platform fields
  useEffect(() => {
    if (prefillHandle) {
      setForm((prev) => ({
        ...prev,
        handle: prefillHandle,
        platform: prefillPlatform ?? Platform.TikTok,
      }));
    }
  }, [prefillHandle, prefillPlatform]);

  const set = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.handle.trim()) {
      newErrors.handle = "Handle is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const creator: Creator = {
      id: `manual-${Date.now()}`,
      handle: form.handle.trim().replace(/^@/, ""),
      platform: form.platform,
      category: (form.category as Category) || undefined,
      followers: parseNum(form.followers),
      avgViews: parseNum(form.avgViews),
      engagementRate: parseNum(form.engagementRate),
      postingFrequency: parseNum(form.postingFrequency),
      contentConsistency:
        (form.contentConsistency as ContentConsistencyLevel) || undefined,
      nicheFocus: (form.nicheFocus as NicheFocusLevel) || undefined,
      gmv30d: parseNum(form.gmv30d),
      gmv60d: parseNum(form.gmv60d),
      gmv90d: parseNum(form.gmv90d),
      livestreamsLast30d: parseNum(form.livestreamsLast30d),
      avgGmvPerLivestream: parseNum(form.avgGmvPerLivestream),
      shopVideoCount: parseNum(form.shopVideoCount),
      svConversionRate: parseNum(form.svConversionRate),
    };

    onParsed([creator]);
    setForm({ ...EMPTY_FORM });
  };

  const showBranding = dataMode === "branding" || dataMode === "both";
  const showConversion = dataMode === "conversion" || dataMode === "both";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Prefill banner */}
      {prefillHandle && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{
            backgroundColor: "rgba(0, 212, 255, 0.08)",
            border: "1px solid rgba(0, 212, 255, 0.25)",
            color: "#00D4FF",
          }}
        >
          <span>🔗</span>
          <span>
            Handle imported from URL — fill in the metrics below to score{" "}
            <strong>@{prefillHandle}</strong>
          </span>
        </div>
      )}

      {/* Identity */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label style={labelStyle()}>Handle *</label>
          <input
            type="text"
            placeholder="@creator"
            value={form.handle}
            onChange={(e) => set("handle", e.target.value)}
            style={inputStyle(!!errors.handle)}
          />
          {errors.handle && (
            <p className="text-[10px] mt-1" style={{ color: "#EF4444" }}>
              {errors.handle}
            </p>
          )}
        </div>
        <div>
          <label style={labelStyle()}>Platform</label>
          <select
            value={form.platform}
            onChange={(e) => set("platform", e.target.value)}
            style={{ ...inputStyle(), cursor: "pointer" }}
          >
            {PLATFORM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} style={{ background: "#12121A" }}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle()}>Category</label>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            style={{ ...inputStyle(), cursor: "pointer" }}
          >
            <option value="" style={{ background: "#12121A" }}>
              Select...
            </option>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} style={{ background: "#12121A" }}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data mode toggle */}
      <div>
        <label style={labelStyle()}>Data available</label>
        <div className="flex gap-2">
          {(["branding", "conversion", "both"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDataMode(mode)}
              className="px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors"
              style={{
                backgroundColor:
                  dataMode === mode ? "rgba(0, 212, 255, 0.15)" : "rgba(18, 18, 26, 0.8)",
                color: dataMode === mode ? "#00D4FF" : "#6B7280",
                border: `1px solid ${dataMode === mode ? "rgba(0, 212, 255, 0.4)" : "#1E1E2E"}`,
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Branding fields */}
      {showBranding && (
        <div>
          <div
            className="text-xs font-semibold mb-2 px-2 py-1 rounded"
            style={{
              color: "#00D4FF",
              backgroundColor: "rgba(0, 212, 255, 0.08)",
              border: "1px solid rgba(0, 212, 255, 0.15)",
            }}
          >
            Branding Signals
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle()}>Followers</label>
              <input
                type="text"
                placeholder="250000"
                value={form.followers}
                onChange={(e) => set("followers", e.target.value)}
                style={inputStyle()}
              />
            </div>
            <div>
              <label style={labelStyle()}>Avg Views / Post</label>
              <input
                type="text"
                placeholder="45000"
                value={form.avgViews}
                onChange={(e) => set("avgViews", e.target.value)}
                style={inputStyle()}
              />
            </div>
            <div>
              <label style={labelStyle()}>Engagement Rate %</label>
              <input
                type="text"
                placeholder="4.5"
                value={form.engagementRate}
                onChange={(e) => set("engagementRate", e.target.value)}
                style={inputStyle()}
              />
            </div>
            <div>
              <label style={labelStyle()}>Posts / Week</label>
              <input
                type="text"
                placeholder="3.5"
                value={form.postingFrequency}
                onChange={(e) => set("postingFrequency", e.target.value)}
                style={inputStyle()}
              />
            </div>
            <div>
              <label style={labelStyle()}>Content Consistency</label>
              <select
                value={form.contentConsistency}
                onChange={(e) => set("contentConsistency", e.target.value)}
                style={{ ...inputStyle(), cursor: "pointer" }}
              >
                <option value="" style={{ background: "#12121A" }}>
                  Select...
                </option>
                <option value="high" style={{ background: "#12121A" }}>
                  High
                </option>
                <option value="medium" style={{ background: "#12121A" }}>
                  Medium
                </option>
                <option value="low" style={{ background: "#12121A" }}>
                  Low
                </option>
              </select>
            </div>
            <div>
              <label style={labelStyle()}>Niche Focus</label>
              <select
                value={form.nicheFocus}
                onChange={(e) => set("nicheFocus", e.target.value)}
                style={{ ...inputStyle(), cursor: "pointer" }}
              >
                <option value="" style={{ background: "#12121A" }}>
                  Select...
                </option>
                <option value="high" style={{ background: "#12121A" }}>
                  High
                </option>
                <option value="medium" style={{ background: "#12121A" }}>
                  Medium
                </option>
                <option value="low" style={{ background: "#12121A" }}>
                  Low
                </option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Conversion fields */}
      {showConversion && (
        <div>
          <div
            className="text-xs font-semibold mb-2 px-2 py-1 rounded"
            style={{
              color: "#F59E0B",
              backgroundColor: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.15)",
            }}
          >
            Conversion Signals
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label style={labelStyle()}>GMV 30d (USD)</label>
              <input
                type="text"
                placeholder="45000"
                value={form.gmv30d}
                onChange={(e) => set("gmv30d", e.target.value)}
                style={inputStyle()}
              />
            </div>
            <div>
              <label style={labelStyle()}>GMV 60d (USD)</label>
              <input
                type="text"
                placeholder="38000"
                value={form.gmv60d}
                onChange={(e) => set("gmv60d", e.target.value)}
                style={inputStyle()}
              />
            </div>
            <div>
              <label style={labelStyle()}>GMV 90d (USD)</label>
              <input
                type="text"
                placeholder="32000"
                value={form.gmv90d}
                onChange={(e) => set("gmv90d", e.target.value)}
                style={inputStyle()}
              />
            </div>
            <div>
              <label style={labelStyle()}>Livestreams / 30d</label>
              <input
                type="text"
                placeholder="12"
                value={form.livestreamsLast30d}
                onChange={(e) => set("livestreamsLast30d", e.target.value)}
                style={inputStyle()}
              />
            </div>
            <div>
              <label style={labelStyle()}>GMV / Livestream</label>
              <input
                type="text"
                placeholder="3750"
                value={form.avgGmvPerLivestream}
                onChange={(e) => set("avgGmvPerLivestream", e.target.value)}
                style={inputStyle()}
              />
            </div>
            <div>
              <label style={labelStyle()}>Shop Videos</label>
              <input
                type="text"
                placeholder="18"
                value={form.shopVideoCount}
                onChange={(e) => set("shopVideoCount", e.target.value)}
                style={inputStyle()}
              />
            </div>
            <div>
              <label style={labelStyle()}>SV Conversion Rate %</label>
              <input
                type="text"
                placeholder="2.4"
                value={form.svConversionRate}
                onChange={(e) => set("svConversionRate", e.target.value)}
                style={inputStyle()}
              />
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
        style={{
          backgroundColor: "#00D4FF",
          color: "#0A0A0F",
        }}
      >
        Add Creator
      </button>
    </form>
  );
}
