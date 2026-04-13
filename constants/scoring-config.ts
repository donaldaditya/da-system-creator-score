export const SCORING_CONFIG = {
  branding: {
    // Engagement rate is the strongest branding signal — it reflects audience resonance
    // and is harder to inflate than raw follower counts
    weights: {
      engagementRate: 0.35,
      viewToFollower: 0.25,
      contentConsistency: 0.20,
      followerBase: 0.10,
      nicheAlignment: 0.10,
    },
    benchmarks: {
      engagementRate: {
        // < 1% = weak, average TikTok ~3%, strong = 6%+
        weak: 1,
        average: 3,
        strong: 6,
      },
      viewToFollower: {
        // < 10% = weak (audience not seeing content), > 30% = strong
        weak: 0.10,
        average: 0.30,
      },
    },
  },
  conversion: {
    // LS tier is the single best predictor of conversion ability — it encodes
    // actual GMV performance, audience buying behavior, and operational maturity
    weights: {
      lsTier: 0.30,
      gmvTrend: 0.25,
      gmvPerLivestream: 0.20,
      svEfficiency: 0.15,
      livestreamFrequency: 0.10,
    },
    // Scores mapped directly from Kalodata LS tier classification
    lsTierScores: {
      LS0: 0,  // Never gone live
      LS1: 5,  // Live but zero GMV
      LS2: 10, // <$1K GMV/30d — just getting started
      LS3: 30, // $1K–$3K — early traction
      LS4: 50, // $3K–$15K — mid-tier performer
      LS5: 70, // $15K–$50K — strong converter
      LS6: 82, // $50K–$100K — high performer
      LS7: 92, // $100K–$1M — top tier
      LS8: 100, // $1M+ — elite
    },
    benchmarks: {
      // 10 livestreams/month ≈ 2-3x/week, considered "active" for scoring purposes
      livestreamFrequencyTarget: 10,
      // 1.0 = neutral trend; <0.7 = declining; >1.3 = accelerating
      gmvTrendNeutral: 1.0,
    },
  },
  composite: {
    // Default 50/50 for "Both" campaign objective; adjustable via weight slider
    defaultBrandingWeight: 0.5,
    defaultConversionWeight: 0.5,
  },
} as const;

export type ScoringConfig = typeof SCORING_CONFIG;
