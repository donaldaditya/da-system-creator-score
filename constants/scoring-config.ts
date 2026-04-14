/**
 * All scoring benchmark values are defined here.
 * Never hardcode thresholds inline — always reference this config.
 *
 * Task 2 spec:
 *   Branding = Reach (20%) + Posting (25%) + Engagement (55%)
 *   Commerce = GMV (35%) + CTR (30%) + CTOR (35%)
 *   Overall  = 0.5 × Branding + 0.5 × Commerce
 */
export const SCORING_CONFIG = {

  branding: {
    weights: {
      reach:      0.20,  // log-normalized followers, cap 5M
      posting:    0.25,  // posts/30d, cap 30
      engagement: 0.55,  // engagement rate %, cap 20%
    },
    benchmarks: {
      reach: {
        capFollowers: 5_000_000,   // log scale ceiling
        minFollowers: 1_000,       // anything below = near-zero score
      },
      posting: {
        capPosts30d: 30,           // ≥30 posts/30d → 100
        goodPosts30d: 12,          // ~3/week → solid mid score
      },
      engagement: {
        capRate: 20,               // ≥20% → 100
        strong: 6,                 // 6%+ is very strong on TikTok
        average: 3,                // ~3% is industry average
        weak: 1,                   // <1% is below par
      },
    },
  },

  commerce: {
    weights: {
      gmv:  0.35,   // total cross-platform GMV, IDR, log-normalized
      ctr:  0.30,   // click-through rate %
      ctor: 0.35,   // click-to-order rate % (orders / clicks)
    },
    benchmarks: {
      gmv: {
        capIDR: 500_000_000,   // IDR 500M/month → 100
        goodIDR: 50_000_000,   // IDR 50M → solid mid score
        weakIDR: 1_000_000,    // IDR 1M → near-zero
      },
      ctr: {
        capRate: 15,           // ≥15% CTR → 100
        strong: 5,             // 5%+ = strong
        average: 2,            // ~2% = average affiliate CTR
        weak: 0.5,             // <0.5% = weak
      },
      ctor: {
        capRate: 30,           // ≥30% CTOR → 100
        strong: 10,            // 10%+ = strong
        average: 3,            // ~3% = industry average
        weak: 0.5,             // <0.5% = weak
      },
    },
  },

  composite: {
    defaultBrandingWeight:  0.5,
    defaultConversionWeight: 0.5,
  },

  // LS tier scores kept for backward compat / legacy data
  lsTierScores: {
    LS0: 0, LS1: 5, LS2: 10, LS3: 30,
    LS4: 50, LS5: 70, LS6: 82, LS7: 92, LS8: 100,
  },

} as const;

export type ScoringConfig = typeof SCORING_CONFIG;
