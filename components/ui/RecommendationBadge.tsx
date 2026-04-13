"use client";

import { RecommendationTag } from "@/types/creator";
import { TAG_META } from "@/lib/scoring/recommendations";

interface RecommendationBadgeProps {
  tag: RecommendationTag;
  size?: "sm" | "md";
}

export function RecommendationBadge({ tag, size = "sm" }: RecommendationBadgeProps) {
  const meta = TAG_META[tag];
  if (!meta) return null;

  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";
  const fontSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap ${padding} ${fontSize}`}
      style={{
        backgroundColor: meta.bgColor,
        color: meta.color,
        border: `1px solid ${meta.color}40`,
      }}
      title={meta.label}
    >
      <span className="text-[11px] leading-none">{meta.emoji}</span>
      <span className="leading-none">{meta.label}</span>
    </span>
  );
}

interface RecommendationBadgeListProps {
  tags: RecommendationTag[];
  max?: number;
  size?: "sm" | "md";
}

export function RecommendationBadgeList({ tags, max = 3, size = "sm" }: RecommendationBadgeListProps) {
  const visible = tags.slice(0, max);
  const overflow = tags.length - max;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag) => (
        <RecommendationBadge key={tag} tag={tag} size={size} />
      ))}
      {overflow > 0 && (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
          style={{
            backgroundColor: "rgba(107, 114, 128, 0.2)",
            color: "#6B7280",
            border: "1px solid rgba(107, 114, 128, 0.3)",
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
