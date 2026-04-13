import { Creator, ConversionScore, LSTier, SignalScore } from "@/types/creator";
import { SCORING_CONFIG } from "@/constants/scoring-config";
import { classifyLsTier } from "./ls-tier";

const W = SCORING_CONFIG.conversion.weights;
const TIER_SCORES = SCORING_CONFIG.conversion.lsTierScores;
const B = SCORING_CONFIG.conversion.benchmarks;

// ─── Individual Signal Normalizers ────────────────────────────────────────────

/**
 * Convert LS tier directly to 0-100 score using config lookup.
 * The tier encoding already captures cumulative GMV performance.
 */
function normalizeLsTier(tier: LSTier): number {
  return TIER_SCORES[tier];
}

/**
 * Normalize GMV trend (ratio of recent to prior period) to 0-100.
 *
 * Trend = gmv30d / (gmv60d - gmv30d) normalized around 1.0
 * < 0.7 = significant decline → 0–30
 * 0.7–1.0 = slight decline → 30–50
 * 1.0 (neutral) → 50
 * 1.0–1.3 = growth → 50–75
 * 1.3–2.0 = strong growth → 75–90
 * 2.0+ = exceptional → 90–100
 */
function normalizeGmvTrend(trend: number): number {
  if (trend <= 0) return 0;
  if (trend >= 2.0) return 95;
  if (trend >= 1.3) return 75 + ((trend - 1.3) / 0.7) * 20;
  if (trend >= B.gmvTrendNeutral) return 50 + ((trend - 1.0) / 0.3) * 25;
  if (trend >= 0.7) return 30 + ((trend - 0.7) / 0.3) * 20;
  return (trend / 0.7) * 30;
}

/**
 * Normalize GMV per livestream to 0-100.
 * Benchmarks derived from typical TikTok Shop performance:
 * < $100/ls = weak, $500 = average, $2K = strong, $10K+ = elite
 */
function normalizeGmvPerLivestream(gmvPerLs: number): number {
  if (gmvPerLs <= 0) return 0;
  if (gmvPerLs >= 10_000) return 100;
  if (gmvPerLs >= 2_000) return 80 + ((gmvPerLs - 2_000) / 8_000) * 20;
  if (gmvPerLs >= 500) return 55 + ((gmvPerLs - 500) / 1_500) * 25;
  if (gmvPerLs >= 100) return 25 + ((gmvPerLs - 100) / 400) * 30;
  return (gmvPerLs / 100) * 25;
}

/**
 * Normalize shop video efficiency (views-to-sale conversion) to 0-100.
 * Uses SV conversion rate % as primary, or derives a proxy from
 * shopVideoViews vs gmv30d if direct rate unavailable.
 *
 * Industry typical: < 0.5% = weak, 1-2% = average, 3%+ = strong
 */
function normalizeSvEfficiency(svConvRate: number): number {
  if (svConvRate <= 0) return 0;
  if (svConvRate >= 5) return 100;
  if (svConvRate >= 3) return 80 + ((svConvRate - 3) / 2) * 20;
  if (svConvRate >= 1) return 50 + ((svConvRate - 1) / 2) * 30;
  if (svConvRate >= 0.5) return 25 + ((svConvRate - 0.5) / 0.5) * 25;
  return (svConvRate / 0.5) * 25;
}

/**
 * Normalize livestream frequency to 0-100.
 * Target = 10 livestreams/month (≈ 2.5/week).
 * Caps at 2× target to avoid rewarding quantity over quality.
 */
function normalizeLivestreamFrequency(count: number): number {
  const target = B.livestreamFrequencyTarget;
  if (count <= 0) return 0;
  if (count >= target * 2) return 100;
  return Math.min(100, (count / target) * 100);
}

// ─── Main Conversion Scorer ───────────────────────────────────────────────────

/**
 * Compute conversion score 0-100 for a creator.
 *
 * Handles single data point (only gmv30d available) by skipping
 * trend signal and redistributing its weight.
 *
 * Missing signals are skipped; weights redistributed proportionally.
 */
export function computeConversionScore(creator: Creator): ConversionScore {
  type SignalKey = keyof typeof W;

  // Determine LS tier — use provided or infer from GMV
  let tier: LSTier | null = creator.lsTier ?? null;
  let inferredLsTier: LSTier | undefined;

  if (!tier) {
    const hasGoneLive = creator.livestreamsLast30d != null && creator.livestreamsLast30d > 0;
    tier = classifyLsTier(creator.gmv30d, hasGoneLive || creator.gmv30d != null);
    inferredLsTier = tier;
  }

  // Compute GMV trend ratio
  // Trend = current period / prior period
  // If we have 60d data: prior30d = gmv60d - gmv30d
  // If we have 90d data: prior60d = gmv90d - gmv30d
  let gmvTrend: number | null = null;
  if (creator.gmv30d != null && creator.gmv60d != null) {
    const prior30d = creator.gmv60d - creator.gmv30d;
    if (prior30d > 0) {
      gmvTrend = creator.gmv30d / prior30d;
    } else if (creator.gmv30d > 0 && prior30d === 0) {
      // Creator went from 0 to positive — strong emerging signal
      gmvTrend = 2.0;
    }
  }
  // Only gmv30d available: no trend computable — skip signal

  // GMV per livestream
  let gmvPerLs: number | null = null;
  if (creator.avgGmvPerLivestream != null) {
    gmvPerLs = creator.avgGmvPerLivestream;
  } else if (creator.gmv30d != null && creator.livestreamsLast30d != null && creator.livestreamsLast30d > 0) {
    gmvPerLs = creator.gmv30d / creator.livestreamsLast30d;
  }

  // SV efficiency
  let svEfficiency: number | null = null;
  if (creator.svConversionRate != null) {
    svEfficiency = creator.svConversionRate;
  } else if (creator.shopVideoViews != null && creator.shopVideoViews > 0 && creator.gmv30d != null) {
    // Rough proxy: assume avg order value ~$20 to estimate conversion count
    const estimatedOrders = creator.gmv30d / 20;
    svEfficiency = (estimatedOrders / creator.shopVideoViews) * 100;
  }

  // Livestream frequency
  const lsFreq: number | null = creator.livestreamsLast30d ?? null;

  // ─── Normalized signals map ──────────────────────────────────────────────

  const normalizedMap: Record<SignalKey, number | null> = {
    lsTier: tier ? normalizeLsTier(tier) : null,
    gmvTrend: gmvTrend != null ? normalizeGmvTrend(gmvTrend) : null,
    gmvPerLivestream: gmvPerLs != null ? normalizeGmvPerLivestream(gmvPerLs) : null,
    svEfficiency: svEfficiency != null ? normalizeSvEfficiency(svEfficiency) : null,
    livestreamFrequency: lsFreq != null ? normalizeLivestreamFrequency(lsFreq) : null,
  };

  const rawMap: Record<SignalKey, number | null> = {
    lsTier: tier ? TIER_SCORES[tier] : null,
    gmvTrend,
    gmvPerLivestream: gmvPerLs,
    svEfficiency,
    livestreamFrequency: lsFreq,
  };

  // ─── Weight redistribution ───────────────────────────────────────────────

  const presentSignals = (Object.keys(normalizedMap) as SignalKey[]).filter(
    (k) => normalizedMap[k] !== null
  );
  const missingSignals = (Object.keys(normalizedMap) as SignalKey[]).filter(
    (k) => normalizedMap[k] === null
  );

  const totalMissingWeight = missingSignals.reduce((sum, k) => sum + W[k], 0);
  const totalPresentWeight = presentSignals.reduce((sum, k) => sum + W[k], 0);

  const effectiveWeights: Record<string, number> = {};
  for (const key of presentSignals) {
    const base = W[key];
    const bonus = totalPresentWeight > 0 ? (base / totalPresentWeight) * totalMissingWeight : 0;
    effectiveWeights[key] = base + bonus;
  }

  // ─── Build signal score objects and total ────────────────────────────────

  let total = 0;
  const signalScores: ConversionScore["signals"] = {
    lsTier: null,
    gmvTrend: null,
    gmvPerLivestream: null,
    svEfficiency: null,
    livestreamFrequency: null,
  };

  for (const key of presentSignals) {
    const normalized = normalizedMap[key]!;
    const weight = effectiveWeights[key];
    const contribution = weight * normalized;
    total += contribution;

    signalScores[key] = {
      rawValue: rawMap[key],
      normalizedScore: Math.round(normalized * 10) / 10,
      weight,
      contribution,
    } as SignalScore;
  }

  return {
    total: Math.round(Math.max(0, Math.min(100, total))),
    signals: signalScores,
    missingSignals,
    dataCompleteness: presentSignals.length / Object.keys(W).length,
    inferredLsTier,
  };
}
