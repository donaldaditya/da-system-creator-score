import {
  Creator,
  BrandingScore,
  ConversionScore,
  CompositeScore,
  RecommendationTag,
  LSTier,
  NicheFocusLevel,
  ContentConsistencyLevel,
} from "@/types/creator";
import { getLsTierIndex } from "./ls-tier";

/**
 * Generate recommendation tags for a creator based on their scored signals.
 *
 * Tags are non-exclusive — a creator can have multiple tags.
 * Each tag maps to a specific campaign use case or risk flag.
 */
export function generateRecommendationTags(
  creator: Creator,
  branding: BrandingScore,
  conversion: ConversionScore,
  composite: CompositeScore
): RecommendationTag[] {
  const tags: RecommendationTag[] = [];

  const lsTierIndex = creator.lsTier
    ? getLsTierIndex(creator.lsTier)
    : conversion.inferredLsTier
    ? getLsTierIndex(conversion.inferredLsTier)
    : 0;

  // Compute GMV trend ratio for tag evaluation
  let gmvTrend: number | null = null;
  if (creator.gmv30d != null && creator.gmv60d != null) {
    const prior30d = creator.gmv60d - creator.gmv30d;
    if (prior30d > 0) {
      gmvTrend = creator.gmv30d / prior30d;
    } else if (creator.gmv30d > 0 && prior30d === 0) {
      gmvTrend = 2.0;
    }
  }
  // 90-day trend (more reliable for "Declining" tag)
  let gmvTrend90: number | null = null;
  if (creator.gmv30d != null && creator.gmv90d != null) {
    const prior60d = creator.gmv90d - creator.gmv30d;
    if (prior60d > 0) {
      gmvTrend90 = creator.gmv30d / (prior60d / 2); // normalize to 30d comparison
    }
  }

  // ─── 🔥 Rising Star ─────────────────────────────────────────────────────
  // Fast-growing account that hasn't hit peak monetization yet.
  // GMV trend > 1.3 (accelerating) AND still below LS5 (room to grow).
  if (gmvTrend != null && gmvTrend > 1.3 && lsTierIndex <= 4) {
    tags.push(RecommendationTag.RisingStar);
  }

  // ─── ⚡ High Converter ───────────────────────────────────────────────────
  // Proven sales engine — strong conversion score indicates consistent GMV delivery.
  if (conversion.total > 75) {
    tags.push(RecommendationTag.HighConverter);
  }

  // ─── 🎯 Brand Safe ──────────────────────────────────────────────────────
  // Premium brand partnership candidate: engaged, consistent, niche-focused.
  // Requires ER > 3%, posting > 3×/week, high niche focus.
  const erSignal = branding.signals.engagement;
  const isHighEngagement = erSignal != null && (erSignal.rawValue ?? 0) > 3;
  const isActivePosting = (creator.postingFrequency != null && creator.postingFrequency > 3) ||
                          (creator.postsLast30d != null && creator.postsLast30d > 12);
  const isNicheFocused =
    creator.nicheFocus === NicheFocusLevel.High ||
    (creator.nicheAlignment != null && creator.nicheAlignment >= 80);

  if (isHighEngagement && isActivePosting && isNicheFocused) {
    tags.push(RecommendationTag.BrandSafe);
  }

  // ─── ⚠️ Declining ───────────────────────────────────────────────────────
  // GMV shrinking significantly over 90 days — flag for review before committing budget.
  const trendForDecline = gmvTrend90 ?? gmvTrend;
  if (trendForDecline != null && trendForDecline < 0.7) {
    tags.push(RecommendationTag.Declining);
  }

  // ─── 💎 Premium ─────────────────────────────────────────────────────────
  // Top-tier creator by either sales volume OR audience size.
  if (lsTierIndex >= 7 || (creator.followers != null && creator.followers >= 1_000_000)) {
    tags.push(RecommendationTag.Premium);
  }

  // ─── 🌱 Emerging ────────────────────────────────────────────────────────
  // Small but punching above their weight — high ER with small audience
  // signals strong community fit and brand authenticity opportunity.
  if (
    creator.followers != null && creator.followers < 50_000 &&
    erSignal != null && (erSignal.rawValue ?? 0) > 5
  ) {
    tags.push(RecommendationTag.Emerging);
  }

  // ─── 📦 Niche Expert ────────────────────────────────────────────────────
  // Deep category authority: perfect category alignment + consistent content.
  const isPerfectCategoryMatch =
    creator.nicheAlignment === 100 || creator.nicheFocus === NicheFocusLevel.High;
  const isConsistent =
    creator.contentConsistency === ContentConsistencyLevel.High;

  if (isPerfectCategoryMatch && isConsistent) {
    tags.push(RecommendationTag.NicheExpert);
  }

  return tags;
}

/**
 * Tag metadata for display purposes (emoji, color class, label)
 */
export const TAG_META: Record<
  RecommendationTag,
  { emoji: string; label: string; color: string; bgColor: string }
> = {
  [RecommendationTag.RisingStar]: {
    emoji: "🔥",
    label: "Rising Star",
    color: "#F97316",
    bgColor: "rgba(249, 115, 22, 0.15)",
  },
  [RecommendationTag.HighConverter]: {
    emoji: "⚡",
    label: "High Converter",
    color: "#00D4FF",
    bgColor: "rgba(0, 212, 255, 0.15)",
  },
  [RecommendationTag.BrandSafe]: {
    emoji: "🎯",
    label: "Brand Safe",
    color: "#10B981",
    bgColor: "rgba(16, 185, 129, 0.15)",
  },
  [RecommendationTag.Declining]: {
    emoji: "⚠️",
    label: "Declining",
    color: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.15)",
  },
  [RecommendationTag.Premium]: {
    emoji: "💎",
    label: "Premium",
    color: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.15)",
  },
  [RecommendationTag.Emerging]: {
    emoji: "🌱",
    label: "Emerging",
    color: "#84CC16",
    bgColor: "rgba(132, 204, 22, 0.15)",
  },
  [RecommendationTag.NicheExpert]: {
    emoji: "📦",
    label: "Niche Expert",
    color: "#A78BFA",
    bgColor: "rgba(167, 139, 250, 0.15)",
  },
};
