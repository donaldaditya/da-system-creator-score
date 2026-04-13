// ─── Enums ───────────────────────────────────────────────────────────────────

export enum LSTier {
  LS0 = "LS0",
  LS1 = "LS1",
  LS2 = "LS2",
  LS3 = "LS3",
  LS4 = "LS4",
  LS5 = "LS5",
  LS6 = "LS6",
  LS7 = "LS7",
  LS8 = "LS8",
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
  Beauty = "beauty",
  Fashion = "fashion",
  Food = "food",
  Tech = "tech",
  Lifestyle = "lifestyle",
  Gaming = "gaming",
  Finance = "finance",
  Health = "health",
  Travel = "travel",
  Parenting = "parenting",
  Sports = "sports",
  Entertainment = "entertainment",
  Education = "education",
  Other = "other",
}

export enum ContentConsistencyLevel {
  High = "high",
  Medium = "medium",
  Low = "low",
}

export enum NicheFocusLevel {
  High = "high",
  Medium = "medium",
  Low = "low",
}

// ─── Raw Creator Input ────────────────────────────────────────────────────────

export interface Creator {
  // Identity
  id: string;
  handle: string;
  platform: Platform;
  category?: Category;
  profileUrl?: string;
  avatarUrl?: string;

  // Branding Metrics
  followers?: number;
  avgViews?: number;           // average views per post/video
  engagementRate?: number;     // percentage, e.g. 4.5 means 4.5%
  postingFrequency?: number;   // posts per week
  contentConsistency?: ContentConsistencyLevel;
  nicheFocus?: NicheFocusLevel;
  nicheAlignment?: number;     // 0-100 score for category match
  followerGrowthRate?: number; // % growth in last 30d (from TTCM / TikTok ONE)

  // Conversion Metrics
  lsTier?: LSTier;
  gmv30d?: number;             // GMV last 30 days in USD
  gmv60d?: number;             // GMV last 60 days in USD
  gmv90d?: number;             // GMV last 90 days in USD
  livestreamsLast30d?: number; // number of livestreams in last 30 days
  avgGmvPerLivestream?: number;
  shopVideoCount?: number;     // shoppable videos
  shopVideoViews?: number;     // total views on shoppable videos
  svConversionRate?: number;   // shop video conversion rate %

  // Metadata
  rawRow?: Record<string, string | number | null>; // original CSV/Excel row
}

// ─── Score Breakdowns ─────────────────────────────────────────────────────────

export interface SignalScore {
  rawValue: number | null;
  normalizedScore: number;  // 0-100
  weight: number;           // effective weight used (may differ if signals missing)
  contribution: number;     // weight × normalizedScore
}

export interface BrandingScore {
  total: number;            // 0-100
  signals: {
    engagementRate: SignalScore | null;
    viewToFollower: SignalScore | null;
    contentConsistency: SignalScore | null;
    followerBase: SignalScore | null;
    nicheAlignment: SignalScore | null;
  };
  missingSignals: string[];
  dataCompleteness: number; // 0-1, fraction of signals present
}

export interface ConversionScore {
  total: number;            // 0-100
  signals: {
    lsTier: SignalScore | null;
    gmvTrend: SignalScore | null;
    gmvPerLivestream: SignalScore | null;
    svEfficiency: SignalScore | null;
    livestreamFrequency: SignalScore | null;
  };
  missingSignals: string[];
  dataCompleteness: number;
  inferredLsTier?: LSTier;  // tier inferred from GMV if not provided directly
}

export interface CompositeScore {
  total: number;            // 0-100
  brandingScore: number;
  conversionScore: number;
  brandingWeight: number;   // e.g. 0.5
  conversionWeight: number; // e.g. 0.5
}

// ─── Fully Scored Creator ─────────────────────────────────────────────────────

export interface ScoredCreator extends Creator {
  branding: BrandingScore;
  conversion: ConversionScore;
  composite: CompositeScore;
  tags: RecommendationTag[];
  rank?: number;            // rank by composite score
}

// ─── Filter & UI State ────────────────────────────────────────────────────────

export interface CreatorFilters {
  platforms: Platform[];
  categories: Category[];
  lsTiers: LSTier[];
  scoreRange: [number, number];   // [min, max] composite score
  tags: RecommendationTag[];
  searchQuery: string;
}

export interface SortConfig {
  field: keyof ScoredCreator | "composite" | "branding" | "conversion";
  direction: "asc" | "desc";
}

export type ViewMode = "table" | "card";
