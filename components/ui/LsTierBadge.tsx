"use client";

import { LSTier } from "@/types/creator";
import { getLsTierLabel } from "@/lib/scoring/ls-tier";

interface LsTierBadgeProps {
  tier: LSTier;
  showLabel?: boolean;
  size?: "sm" | "md";
}

function getTierStyles(tier: LSTier): {
  bg: string;
  text: string;
  border: string;
  glow?: string;
} {
  const idx = parseInt(tier.replace("LS", ""), 10);

  if (idx <= 2) {
    // Grey — no commerce activity or sub-$1K
    return {
      bg: "rgba(75, 85, 99, 0.2)",
      text: "#9CA3AF",
      border: "rgba(75, 85, 99, 0.4)",
    };
  }
  if (idx <= 4) {
    // Amber — early traction $1K–$15K
    return {
      bg: "rgba(245, 158, 11, 0.15)",
      text: "#F59E0B",
      border: "rgba(245, 158, 11, 0.35)",
    };
  }
  if (idx <= 6) {
    // Blue — strong converter $15K–$100K
    return {
      bg: "rgba(0, 212, 255, 0.12)",
      text: "#00D4FF",
      border: "rgba(0, 212, 255, 0.35)",
    };
  }
  // Gold — elite $100K+ with glow
  return {
    bg: "rgba(245, 158, 11, 0.2)",
    text: "#F59E0B",
    border: "rgba(245, 158, 11, 0.5)",
    glow: "0 0 8px rgba(245, 158, 11, 0.25)",
  };
}

export function LsTierBadge({ tier, showLabel = false, size = "sm" }: LsTierBadgeProps) {
  const styles = getTierStyles(tier);
  const label = getLsTierLabel(tier);
  const isElite = parseInt(tier.replace("LS", ""), 10) >= 7;

  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2.5 py-1";
  const fontSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-mono font-semibold leading-none ${padding} ${fontSize}`}
      style={{
        backgroundColor: styles.bg,
        color: styles.text,
        border: `1px solid ${styles.border}`,
        boxShadow: styles.glow,
      }}
      title={label}
    >
      {isElite && <span className="text-[8px]">★</span>}
      {tier}
      {showLabel && (
        <span className="font-normal opacity-75 ml-0.5">· {label}</span>
      )}
    </span>
  );
}
