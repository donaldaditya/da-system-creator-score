import { LSTier } from "@/types/creator";

// GMV thresholds in USD for LS tier classification (30-day window)
// These thresholds are aligned with Kalodata's tier definitions
const LS_TIER_GMV_THRESHOLDS: Array<{ tier: LSTier; minGmv: number }> = [
  { tier: LSTier.LS8, minGmv: 1_000_000 }, // $1M+
  { tier: LSTier.LS7, minGmv: 100_000 },   // $100K–$1M
  { tier: LSTier.LS6, minGmv: 50_000 },    // $50K–$100K
  { tier: LSTier.LS5, minGmv: 15_000 },    // $15K–$50K
  { tier: LSTier.LS4, minGmv: 3_000 },     // $3K–$15K
  { tier: LSTier.LS3, minGmv: 1_000 },     // $1K–$3K
  { tier: LSTier.LS2, minGmv: 1 },         // $1–$1K (any positive GMV)
];

/**
 * Classify a creator into an LS tier based on their 30-day GMV.
 *
 * Rules:
 * - null/undefined gmv30d → LS0 (never gone live / no data)
 * - gmv30d === 0 and creator has gone live → LS1
 * - gmv30d > 0 → LS2 through LS8 based on thresholds
 *
 * @param gmv30d - GMV in USD over the last 30 days (null if never gone live)
 * @param hasGoneLive - explicit flag; if false, forces LS0 regardless of GMV
 */
export function classifyLsTier(
  gmv30d: number | null | undefined,
  hasGoneLive?: boolean
): LSTier {
  // Never gone live — no live commerce activity at all
  if (hasGoneLive === false || gmv30d === undefined || gmv30d === null) {
    return LSTier.LS0;
  }

  // Has gone live but zero GMV — activity without monetization
  if (gmv30d === 0) {
    return LSTier.LS1;
  }

  // Classify by GMV threshold (highest tier wins)
  for (const { tier, minGmv } of LS_TIER_GMV_THRESHOLDS) {
    if (gmv30d >= minGmv) {
      return tier;
    }
  }

  // Fallback (should not reach here given LS2 threshold is $1)
  return LSTier.LS2;
}

/**
 * Human-readable label for each LS tier
 */
export function getLsTierLabel(tier: LSTier): string {
  const labels: Record<LSTier, string> = {
    [LSTier.LS0]: "No Live",
    [LSTier.LS1]: "Live / No GMV",
    [LSTier.LS2]: "< $1K",
    [LSTier.LS3]: "$1K – $3K",
    [LSTier.LS4]: "$3K – $15K",
    [LSTier.LS5]: "$15K – $50K",
    [LSTier.LS6]: "$50K – $100K",
    [LSTier.LS7]: "$100K – $1M",
    [LSTier.LS8]: "$1M+",
  };
  return labels[tier];
}

/**
 * Get the numeric tier index (0-8) for comparison purposes
 */
export function getLsTierIndex(tier: LSTier): number {
  return parseInt(tier.replace("LS", ""), 10);
}
