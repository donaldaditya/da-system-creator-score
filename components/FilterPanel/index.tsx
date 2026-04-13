"use client";

import { Platform, Category, LSTier, RecommendationTag } from "@/types/creator";
import type { CreatorFilters } from "@/types/creator";

interface FilterPanelProps {
  filters: CreatorFilters;
  onChange: (filters: Partial<CreatorFilters>) => void;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: "#6B7280" }}>
      {children}
    </p>
  );
}

function CheckboxGroup<T extends string>({
  options,
  selected,
  onChange,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (values: T[]) => void;
}) {
  const toggle = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {options.map((opt) => {
        const checked = selected.includes(opt.value);
        return (
          <label
            key={opt.value}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div
              className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
              style={{
                backgroundColor: checked ? "rgba(0, 212, 255, 0.2)" : "rgba(30, 30, 46, 0.8)",
                border: `1px solid ${checked ? "#00D4FF" : "#374151"}`,
              }}
              onClick={() => toggle(opt.value)}
            >
              {checked && (
                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                  <path
                    d="M1 3L3 5L7 1"
                    stroke="#00D4FF"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span
              className="text-xs transition-colors"
              style={{ color: checked ? "#E8EAF0" : "#9CA3AF" }}
              onClick={() => toggle(opt.value)}
            >
              {opt.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

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

const LS_TIER_OPTIONS = (
  ["LS0", "LS1", "LS2", "LS3", "LS4", "LS5", "LS6", "LS7", "LS8"] as LSTier[]
).map((t) => ({ value: t, label: t }));

const TAG_OPTIONS = [
  { value: RecommendationTag.RisingStar, label: "🔥 Rising Star" },
  { value: RecommendationTag.HighConverter, label: "⚡ High Converter" },
  { value: RecommendationTag.BrandSafe, label: "🎯 Brand Safe" },
  { value: RecommendationTag.Premium, label: "💎 Premium" },
  { value: RecommendationTag.Emerging, label: "🌱 Emerging" },
  { value: RecommendationTag.NicheExpert, label: "📦 Niche Expert" },
  { value: RecommendationTag.Declining, label: "⚠️ Declining" },
];

export function FilterPanel({
  filters,
  onChange,
  onReset,
  totalCount,
  filteredCount,
}: FilterPanelProps) {
  const hasActiveFilters =
    filters.platforms.length > 0 ||
    filters.categories.length > 0 ||
    filters.lsTiers.length > 0 ||
    filters.tags.length > 0 ||
    filters.scoreRange[0] > 0 ||
    filters.scoreRange[1] < 100 ||
    filters.searchQuery.trim().length > 0;

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        backgroundColor: "#12121A",
        border: "1px solid #1E1E2E",
        minWidth: "200px",
        maxWidth: "220px",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #1E1E2E" }}
      >
        <span className="text-xs font-semibold" style={{ color: "#E8EAF0" }}>
          Filters
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: "#6B7280" }}>
            {filteredCount}/{totalCount}
          </span>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-[10px] px-1.5 py-0.5 rounded transition-colors"
              style={{
                color: "#00D4FF",
                backgroundColor: "rgba(0, 212, 255, 0.1)",
                border: "1px solid rgba(0, 212, 255, 0.2)",
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <input
          type="text"
          placeholder="Search handle..."
          value={filters.searchQuery}
          onChange={(e) => onChange({ searchQuery: e.target.value })}
          className="w-full text-xs rounded px-2 py-1.5 outline-none"
          style={{
            backgroundColor: "#0A0A0F",
            border: "1px solid #1E1E2E",
            color: "#E8EAF0",
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {/* Score Range */}
        <div>
          <SectionTitle>
            Score Range ({filters.scoreRange[0]}–{filters.scoreRange[1]})
          </SectionTitle>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={filters.scoreRange[1]}
              value={filters.scoreRange[0]}
              onChange={(e) =>
                onChange({ scoreRange: [Number(e.target.value), filters.scoreRange[1]] })
              }
              className="flex-1"
              style={{ accentColor: "#00D4FF" }}
            />
            <input
              type="range"
              min={filters.scoreRange[0]}
              max={100}
              value={filters.scoreRange[1]}
              onChange={(e) =>
                onChange({ scoreRange: [filters.scoreRange[0], Number(e.target.value)] })
              }
              className="flex-1"
              style={{ accentColor: "#00D4FF" }}
            />
          </div>
        </div>

        {/* Platform */}
        <div>
          <SectionTitle>Platform</SectionTitle>
          <CheckboxGroup
            options={PLATFORM_OPTIONS}
            selected={filters.platforms}
            onChange={(platforms) => onChange({ platforms })}
          />
        </div>

        {/* Category */}
        <div>
          <SectionTitle>Category</SectionTitle>
          <CheckboxGroup
            options={CATEGORY_OPTIONS}
            selected={filters.categories}
            onChange={(categories) => onChange({ categories })}
          />
        </div>

        {/* LS Tier */}
        <div>
          <SectionTitle>LS Tier</SectionTitle>
          <div className="flex flex-wrap gap-1">
            {LS_TIER_OPTIONS.map((opt) => {
              const selected = filters.lsTiers.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    const newTiers = selected
                      ? filters.lsTiers.filter((t) => t !== opt.value)
                      : [...filters.lsTiers, opt.value];
                    onChange({ lsTiers: newTiers });
                  }}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors"
                  style={{
                    backgroundColor: selected
                      ? "rgba(0, 212, 255, 0.15)"
                      : "rgba(30, 30, 46, 0.8)",
                    color: selected ? "#00D4FF" : "#6B7280",
                    border: `1px solid ${selected ? "rgba(0, 212, 255, 0.35)" : "#1E1E2E"}`,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        <div>
          <SectionTitle>Tags</SectionTitle>
          <div className="flex flex-col gap-1">
            {TAG_OPTIONS.map((opt) => {
              const selected = filters.tags.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    const newTags = selected
                      ? filters.tags.filter((t) => t !== opt.value)
                      : [...filters.tags, opt.value];
                    onChange({ tags: newTags });
                  }}
                  className="text-left px-2 py-1 rounded text-[10px] transition-colors"
                  style={{
                    backgroundColor: selected
                      ? "rgba(0, 212, 255, 0.1)"
                      : "transparent",
                    color: selected ? "#E8EAF0" : "#9CA3AF",
                    border: `1px solid ${selected ? "rgba(0, 212, 255, 0.25)" : "transparent"}`,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
