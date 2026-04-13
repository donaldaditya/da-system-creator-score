import { Creator, BrandingScore, SignalScore, ContentConsistencyLevel, NicheFocusLevel } from "@/types/creator";
import { SCORING_CONFIG } from "@/constants/scoring-config";

const W = SCORING_CONFIG.branding.weights;
const B = SCORING_CONFIG.branding.benchmarks;

// ─── Individual Signal Normalizers ────────────────────────────────────────────

/**
 * Normalize engagement rate to 0-100.
 * Uses piecewise linear scaling:
 * 0 → 0, weak(1%) → 20, average(3%) → 50, strong(6%) → 85, 10%+ → 100
 * ER > 3% is genuinely good; > 6% exceptional.
 */
function normalizeEngagementRate(er: number): number {
  if (er <= 0) return 0;
  if (er >= 10) return 100;
  if (er >= B.engagementRate.strong) {
    // 6% to 10% maps to 85–100
    return 85 + ((er - B.engagementRate.strong) / (10 - B.engagementRate.strong)) * 15;
  }
  if (er >= B.engagementRate.average) {
    // 3% to 6% maps to 50–85
    return 50 + ((er - B.engagementRate.average) / (B.engagementRate.strong - B.engagementRate.average)) * 35;
  }
  if (er >= B.engagementRate.weak) {
    // 1% to 3% maps to 20–50
    return 20 + ((er - B.engagementRate.weak) / (B.engagementRate.average - B.engagementRate.weak)) * 30;
  }
  // 0% to 1% maps to 0–20
  return (er / B.engagementRate.weak) * 20;
}

/**
 * Normalize view-to-follower ratio to 0-100.
 * < 10% = weak (content not reaching audience), > 30% = strong reach.
 */
function normalizeViewToFollower(ratio: number): number {
  if (ratio <= 0) return 0;
  if (ratio >= 1.0) return 100; // 100%+ view-to-follower is exceptional
  if (ratio >= B.viewToFollower.average) {
    // 30%+ maps 30–100% → 70–100 score
    return 70 + Math.min(30, ((ratio - B.viewToFollower.average) / (1.0 - B.viewToFollower.average)) * 30);
  }
  if (ratio >= B.viewToFollower.weak) {
    // 10–30% maps to 30–70
    return 30 + ((ratio - B.viewToFollower.weak) / (B.viewToFollower.average - B.viewToFollower.weak)) * 40;
  }
  // 0–10% maps to 0–30
  return (ratio / B.viewToFollower.weak) * 30;
}

/**
 * Normalize content consistency level to 0-100.
 * Consistent posting = audience retention and algorithmic favor.
 */
function normalizeContentConsistency(level: ContentConsistencyLevel | string): number {
  switch (level) {
    case ContentConsistencyLevel.High:
    case "high":
      return 90;
    case ContentConsistencyLevel.Medium:
    case "medium":
      return 55;
    case ContentConsistencyLevel.Low:
    case "low":
      return 20;
    default:
      return 50; // neutral if unknown
  }
}

/**
 * Normalize follower count using log scale (0-100).
 * Log normalization prevents mega-influencers from dominating;
 * micro-influencers with 10K followers can still score well.
 * Scale: 1K → ~20, 10K → ~40, 100K → ~60, 1M → ~80, 10M+ → 100
 */
function normalizeFollowerBase(followers: number): number {
  if (followers <= 0) return 0;
  const logVal = Math.log10(followers);
  // log10(1000) ≈ 3, log10(10M) ≈ 7 → scale 3-7 to 20-100
  const score = ((logVal - 3) / (7 - 3)) * 80 + 20;
  return Math.max(0, Math.min(100, score));
}

/**
 * Normalize niche alignment score (already 0-100) or niche focus level.
 */
function normalizeNicheAlignment(value: number | NicheFocusLevel | string): number {
  if (typeof value === "number") {
    return Math.max(0, Math.min(100, value));
  }
  switch (value) {
    case NicheFocusLevel.High:
    case "high":
      return 90;
    case NicheFocusLevel.Medium:
    case "medium":
      return 55;
    case NicheFocusLevel.Low:
    case "low":
      return 20;
    default:
      return 50;
  }
}

// ─── Main Branding Scorer ─────────────────────────────────────────────────────

/**
 * Compute branding score 0-100 for a creator.
 *
 * Missing signals are skipped and their weights are redistributed
 * proportionally among present signals to avoid penalizing creators
 * for incomplete data input.
 */
export function computeBrandingScore(creator: Creator): BrandingScore {
  type SignalKey = keyof typeof W;

  // Build raw signal map — null means "missing / not computable"
  const rawSignals: Record<SignalKey, number | null> = {
    engagementRate: null,
    viewToFollower: null,
    contentConsistency: null,
    followerBase: null,
    nicheAlignment: null,
  };

  // Engagement rate — direct if provided, or compute from available data
  if (creator.engagementRate != null) {
    rawSignals.engagementRate = creator.engagementRate;
  }

  // View-to-follower ratio
  if (creator.avgViews != null && creator.followers != null && creator.followers > 0) {
    rawSignals.viewToFollower = creator.avgViews / creator.followers;
  }

  // Content consistency
  if (creator.contentConsistency != null) {
    rawSignals.contentConsistency = creator.contentConsistency as unknown as number;
  } else if (creator.postingFrequency != null) {
    // Infer from posting frequency: < 1/wk = low, 1-3/wk = medium, 3+/wk = high
    const freq = creator.postingFrequency;
    rawSignals.contentConsistency = freq >= 3 ? 1 : freq >= 1 ? 0.5 : 0.2; // placeholder for computation
  }

  // Follower base
  if (creator.followers != null) {
    rawSignals.followerBase = creator.followers;
  }

  // Niche alignment
  if (creator.nicheAlignment != null) {
    rawSignals.nicheAlignment = creator.nicheAlignment;
  } else if (creator.nicheFocus != null) {
    rawSignals.nicheAlignment = creator.nicheFocus as unknown as number;
  }

  // ─── Normalize signals ───────────────────────────────────────────────────

  const normalizedSignals: Record<SignalKey, number | null> = {
    engagementRate: null,
    viewToFollower: null,
    contentConsistency: null,
    followerBase: null,
    nicheAlignment: null,
  };

  if (rawSignals.engagementRate != null) {
    normalizedSignals.engagementRate = normalizeEngagementRate(rawSignals.engagementRate);
  }

  if (rawSignals.viewToFollower != null) {
    normalizedSignals.viewToFollower = normalizeViewToFollower(rawSignals.viewToFollower);
  }

  if (rawSignals.contentConsistency != null) {
    // If we have the actual level enum, normalize; if computed as number proxy, handle accordingly
    if (creator.contentConsistency != null) {
      normalizedSignals.contentConsistency = normalizeContentConsistency(creator.contentConsistency);
    } else if (creator.postingFrequency != null) {
      const freq = creator.postingFrequency;
      const level = freq >= 3 ? ContentConsistencyLevel.High : freq >= 1 ? ContentConsistencyLevel.Medium : ContentConsistencyLevel.Low;
      normalizedSignals.contentConsistency = normalizeContentConsistency(level);
    }
  }

  if (rawSignals.followerBase != null) {
    normalizedSignals.followerBase = normalizeFollowerBase(rawSignals.followerBase);
  }

  if (rawSignals.nicheAlignment != null) {
    if (creator.nicheAlignment != null) {
      normalizedSignals.nicheAlignment = normalizeNicheAlignment(creator.nicheAlignment);
    } else if (creator.nicheFocus != null) {
      normalizedSignals.nicheAlignment = normalizeNicheAlignment(creator.nicheFocus);
    }
  }

  // ─── Redistribute weights for missing signals ────────────────────────────

  const presentSignals = (Object.keys(normalizedSignals) as SignalKey[]).filter(
    (k) => normalizedSignals[k] !== null
  );
  const missingSignals = (Object.keys(normalizedSignals) as SignalKey[]).filter(
    (k) => normalizedSignals[k] === null
  );

  const totalMissingWeight = missingSignals.reduce((sum, k) => sum + W[k], 0);
  const totalPresentWeight = presentSignals.reduce((sum, k) => sum + W[k], 0);

  // Effective weight = base weight + proportional share of missing weight
  const effectiveWeights: Record<SignalKey, number> = {} as Record<SignalKey, number>;
  for (const key of presentSignals) {
    const base = W[key];
    const bonus = totalPresentWeight > 0 ? (base / totalPresentWeight) * totalMissingWeight : 0;
    effectiveWeights[key] = base + bonus;
  }

  // ─── Compute total score ─────────────────────────────────────────────────

  let total = 0;
  const signalScores: BrandingScore["signals"] = {
    engagementRate: null,
    viewToFollower: null,
    contentConsistency: null,
    followerBase: null,
    nicheAlignment: null,
  };

  for (const key of presentSignals) {
    const normalized = normalizedSignals[key]!;
    const weight = effectiveWeights[key];
    const contribution = weight * normalized;
    total += contribution;

    signalScores[key] = {
      rawValue: rawSignals[key],
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
  };
}
