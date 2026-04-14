// ─── Enums ───────────────────────────────────────────────────────────────────

export enum LSTier {
  LS0 = "LS0", LS1 = "LS1", LS2 = "LS2", LS3 = "LS3",
  LS4 = "LS4", LS5 = "LS5", LS6 = "LS6", LS7 = "LS7", LS8 = "LS8",
}

export enum RecommendationTag {
  RisingStar = "Rising Star",
  HighConverter = "High Converter",
  BrandSafe = "Brand Safe",
  Declining = "Declining",
  Premium = "Premium",
  Emerging = "Emerging",
  NicheExpert = "Niche Expert",
}

export enum CampaignObjective {
  Branding = "branding",
  Conversion = "conversion",
  Both = "both",
}

export enum Platform {
  TikTok = "tiktok",
  Instagram = "instagram",
  Shopee = "shopee",
}

export enum Category {
  Beauty = "beauty", Fashion = "fashion", Food = "food", Tech = "tech",
  Lifestyle = "lifestyle", Gaming = "gaming", Finance = "finance",
  Health = "health", Travel = "travel", Parenting = "parenting",
  Sports = "sports", Entertainment = "entertainment", Education = "education",
  Other = "other",
}

export enum ContentConsistencyLevel {
  High = "high", Medium = "medium", Low = "low",
}

export enum NicheFocusLevel {
  High = "high", Medium = "medium", Low = "low",
}

/** Which data sources contributed to this creator's score */
export type ScoreBadge = "Full Score" | "Branding Only" | "Commerce Only" | "No Data";

// ─── Raw Creator Input ────────────────────────────────────────────────────────

export interface Creator {
  // Identity
  id: string;
  handle: string;
  platform: Platform;
  category?: Category;
  profileUrl?: string;
  avatarUrl?: string;

  // Branding Metrics (Task 2: Reach 20% + Posting 25% + Engagement 55%)
  followers?: number;          // reach signal
  avgViews?: number;           // average views per post/video
  engagementRate?: number;     // % — primary branding signal (55% weight)
  postingFrequency?: number;   // posts per week (converted to /30d in scorer)
  postsLast30d?: number;       // posts in last 30 days (direct from TikTok ONE)
  contentConsistency?: ContentConsistencyLevel;
  nicheFocus?: NicheFocusLevel;
  nicheAlignment?: number;     // 0-100 score
  followerGrowthRate?: number; // % growth 30d (from TTCM)

  // Commerce Metrics (Task 2: GMV 35% + CTR 30% + CTOR 35%)
  // GMV — stored in IDR (Indonesian Rupiah)
  gmv30d?: number;             // total GMV last 30d (cross-platform, IDR)
  gmv60d?: number;
  gmv90d?: number;
  tiktokGmv30d?: number;       // TikTok-only GMV (IDR)
  shopeeGmv30d?: number;       // Shopee-only GMV (IDR)
  ctr?: number;                // click-through rate %
  ctor?: number;               // click-to-order rate % (orders/clicks)
  clicks30d?: number;          // total clicks (for CTOR derivation)
  orders30d?: number;          // completed orders (for CTOR derivation)
  avgOrderValue?: number;      // IDR
  topContentType?: string;     // e.g. "Livestream", "Video"
  channelMix?: Record<string, number>; // { Instagram: 0.4, TikTok: 0.6 }
  instagramShopeeConvRate?: number; // IG→Shopee conv rate %

  // Legacy TikTok Shop signals (kept for backward compat)
  lsTier?: LSTier;
  livestreamsLast30d?: number;
  avgGmvPerLivestream?: number;
  shopVideoCount?: number;
  shopVideoViews?: number;
  svConversionRate?: number;

  // Data source tracking
  sources?: Platform[]; // which platforms contributed data

  // Metadata
  rawRow?: Record<string, string | number | null>;
}

// ─── Signal Score ─────────────────────────────────────────────────────────────

export interface SignalScore {
  rawValue: number | null;
  normalizedScore: number;   // 0-100
  weight: number;            // effective weight used
  contribution: number;      // weight × normalizedScore
  label?: string;            // display name for tooltip
}

// ─── Branding Score (Task 2) ──────────────────────────────────────────────────

export interface BrandingScore {
  total: number;             // 0-100
  signals: {
    reach: SignalScore | null;       // followers, log-normalized
    posting: SignalScore | null;     // posts/30d
    engagement: SignalScore | null;  // engagement rate %
  };
  missingSignals: string[];
  dataCompleteness: number;  // 0-1
}

// Legacy alias — kept so existing results page references don't break immediately
export type BrandingScoreBreakdown = BrandingScore;

// ─── Commerce Score (Task 2) ──────────────────────────────────────────────────

export interface CommerceScore {
  total: number;             // 0-100
  signals: {
    gmv: SignalScore | null;    // total cross-platform GMV, IDR
    ctr: SignalScore | null;    // click-through rate %
    ctor: SignalScore | null;   // click-to-order rate %
  };
  ctorMissing: boolean;      // true if CTOR had to be derived or was absent
  missingSignals: string[];
  dataCompleteness: number;
  inferredLsTier?: LSTier;   // kept for backward compat
}

// Legacy alias
export type ConversionScore = CommerceScore & {
  // shim: results page uses signals.lsTier etc — provide nulls so nothing breaks
  signals: CommerceScore["signals"] & {
    lsTier?: SignalScore | null;
    gmvTrend?: SignalScore | null;
    gmvPerLivestream?: SignalScore | null;
    svEfficiency?: SignalScore | null;
    livestreamFrequency?: SignalScore | null;
  };
};

// ─── Composite Score ──────────────────────────────────────────────────────────

export interface CompositeScore {
  total: number;             // 0-100 — Overall Score
  brandingScore: number;
  conversionScore: number;   // = commerce score
  brandingWeight: number;
  conversionWeight: number;
  badge: ScoreBadge;         // Full Score / Branding Only / Commerce Only
}

// ─── Scored Creator ───────────────────────────────────────────────────────────

export interface ScoredCreator extends Creator {
  branding: BrandingScore;
  conversion: ConversionScore; // renamed in new model but kept for compat
  composite: CompositeScore;
  tags: RecommendationTag[];
  rank?: number;
}

// ─── Filter & UI State ────────────────────────────────────────────────────────

export interface CreatorFilters {
  platforms: Platform[];
  categories: Category[];
  lsTiers: LSTier[];
  scoreRange: [number, number];
  tags: RecommendationTag[];
  searchQuery: string;
}

export interface SortConfig {
  field: keyof ScoredCreator | "composite" | "branding" | "conversion" | "gmv";
  direction: "asc" | "desc";
}

export type ViewMode = "table" | "card";

// ─── Lead Gate ────────────────────────────────────────────────────────────────

export interface LeadData {
  name: string;
  email: string;
  company: string;
  timestamp: number;
}
