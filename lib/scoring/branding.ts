/**
 * Branding scorer — Task 2
 *
 * Signals:
 *   Reach      (20%) — log-normalized followers, cap 5M
 *   Posting    (25%) — posts per 30 days, cap 30
 *   Engagement (55%) — engagement rate %, cap 20%
 *
 * Missing signals have their weight redistributed proportionally
 * among present signals, so partial data still produces a meaningful score.
 */

import { Creator, BrandingScore, SignalScore } from "@/types/creator";
import { SCORING_CONFIG } from "@/constants/scoring-config";

const W = SCORING_CONFIG.branding.weights;
const B = SCORING_CONFIG.branding.benchmarks;

type SignalKey = keyof typeof W;

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normalizeReach(followers: number): number {
  if (followers <= 0) return 0;
  const min = Math.log10(Math.max(followers, B.reach.minFollowers));
  const max = Math.log10(B.reach.capFollowers);
  const base = Math.log10(B.reach.minFollowers);
  return Math.min(100, Math.max(0, ((min - base) / (max - base)) * 100));
}

function normalizePosting(posts30d: number): number {
  if (posts30d <= 0) return 0;
  return Math.min(100, (posts30d / B.posting.capPosts30d) * 100);
}

function normalizeEngagement(er: number): number {
  if (er <= 0) return 0;
  if (er >= B.engagement.capRate) return 100;
  // Piecewise: weak(1%) → 20, average(3%) → 50, strong(6%) → 85, cap(20%) → 100
  if (er >= B.engagement.strong) {
    return 85 + ((er - B.engagement.strong) / (B.engagement.capRate - B.engagement.strong)) * 15;
  }
  if (er >= B.engagement.average) {
    return 50 + ((er - B.engagement.average) / (B.engagement.strong - B.engagement.average)) * 35;
  }
  if (er >= B.engagement.weak) {
    return 20 + ((er - B.engagement.weak) / (B.engagement.average - B.engagement.weak)) * 30;
  }
  return (er / B.engagement.weak) * 20;
}

// ─── Main scorer ──────────────────────────────────────────────────────────────

export function computeBrandingScore(creator: Creator): BrandingScore {
  // Derive posts/30d
  let posts30d: number | null = null;
  if (creator.postsLast30d != null) {
    posts30d = creator.postsLast30d;
  } else if (creator.postingFrequency != null) {
    posts30d = creator.postingFrequency * (30 / 7); // posts/week → posts/30d
  }

  const rawMap: Record<SignalKey, number | null> = {
    reach:      creator.followers ?? null,
    posting:    posts30d,
    engagement: creator.engagementRate ?? null,
  };

  const normalizedMap: Record<SignalKey, number | null> = {
    reach:      rawMap.reach != null      ? normalizeReach(rawMap.reach)           : null,
    posting:    rawMap.posting != null    ? normalizePosting(rawMap.posting)        : null,
    engagement: rawMap.engagement != null ? normalizeEngagement(rawMap.engagement)  : null,
  };

  // Weight redistribution
  const present = (Object.keys(W) as SignalKey[]).filter((k) => normalizedMap[k] !== null);
  const missing = (Object.keys(W) as SignalKey[]).filter((k) => normalizedMap[k] === null);

  const totalMissingW = missing.reduce((s, k) => s + W[k], 0);
  const totalPresentW = present.reduce((s, k) => s + W[k], 0);

  const effectiveW: Record<SignalKey, number> = {} as Record<SignalKey, number>;
  for (const k of present) {
    const base = W[k];
    effectiveW[k] = base + (totalPresentW > 0 ? (base / totalPresentW) * totalMissingW : 0);
  }

  let total = 0;
  const signals: BrandingScore["signals"] = { reach: null, posting: null, engagement: null };

  const labels: Record<SignalKey, string> = {
    reach: "Reach (Followers)",
    posting: "Posting Frequency",
    engagement: "Engagement Rate",
  };

  for (const k of present) {
    const norm = normalizedMap[k]!;
    const w = effectiveW[k];
    const contribution = w * norm;
    total += contribution;
    signals[k] = {
      rawValue: rawMap[k],
      normalizedScore: Math.round(norm * 10) / 10,
      weight: w,
      contribution,
      label: labels[k],
    } as SignalScore;
  }

  return {
    total: Math.round(Math.max(0, Math.min(100, total))),
    signals,
    missingSignals: missing,
    dataCompleteness: present.length / Object.keys(W).length,
  };
}
