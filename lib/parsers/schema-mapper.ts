/**
 * Fuzzy column header mapper.
 *
 * Maps common CSV/Excel column name variants to internal Creator field names.
 * Handles:
 * - TikTok Partner Center exports (affiliate_orders_*.xlsx)
 * - TikTok Creator Marketplace exports
 * - TikTok ONE exports
 * - Kalodata exports
 * - Manual entry / custom templates
 */

// Map of internal field name → array of accepted column header variants
// Sorted roughly from most specific to most generic
const COLUMN_ALIASES: Record<string, string[]> = {
  // ─── Identity ────────────────────────────────────────────────────────────────
  handle: [
    // TikTok Creator Marketplace
    "tiktok account",
    "tiktok username",
    "tiktok handle",
    "tiktok id",
    "creator tiktok",
    // TikTok ONE
    "creator id",
    "display name",
    "tiktok display name",
    "influencer name",
    "influencer",
    // Generic
    "handle",
    "username",
    "creator_handle",
    "instagram_handle",
    "ig handle",
    "@handle",
    "account",
    "creator",
    "creator name",
    "creator username",
    "affiliate",
    "affiliate name",
    "profile",
    "name",
    "tiktoker",
    "kol name",
    "kol",
  ],
  platform: [
    "platform",
    "social platform",
    "channel",
    "network",
    "source platform",
  ],
  category: [
    // TikTok Creator Marketplace
    "creator category",
    "creator niche",
    "content category",
    "content type category",
    // TikTok ONE
    "primary category",
    "main category",
    // Generic
    "category",
    "niche",
    "vertical",
    "industry",
    "topic",
    "genre",
    "tag",
  ],
  profileUrl: [
    "profile url",
    "profile link",
    "tiktok url",
    "tiktok profile url",
    "tiktok profile link",
    "instagram url",
    "creator url",
    "page url",
    "url",
    "link",
    "profile_url",
  ],
  avatarUrl: [
    "avatar url",
    "avatar",
    "profile photo",
    "photo url",
    "image url",
    "thumbnail",
    "avatar_url",
  ],

  // ─── Branding Metrics ────────────────────────────────────────────────────────
  followers: [
    // TikTok Creator Marketplace
    "followers",
    "follower count",
    "tiktok followers",
    "total followers",
    "follower number",
    // TikTok ONE
    "fans",
    "fan count",
    "audience size",
    "following count",
    "followers count",
    "current followers",
    // Chinese
    "粉丝数",
    "粉丝",
  ],
  avgViews: [
    // TikTok Creator Marketplace
    "avg. video views",
    "average video views",
    "avg video views",
    "avg. views",
    "average views",
    // TikTok ONE
    "avg views per video",
    "average views per video",
    "video views avg",
    "mean video views",
    "avg video plays",
    // Generic
    "avg_views",
    "average_views",
    "views per post",
    "avg views",
    "views avg",
    // Chinese
    "平均播放量",
  ],
  engagementRate: [
    // TikTok Creator Marketplace
    "engagement rate",
    "engagement rate (%)",
    "avg. engagement rate",
    "average engagement rate",
    "er (%)",
    // TikTok ONE
    "interaction rate",
    "avg er",
    "video engagement rate",
    // Generic
    "engagement_rate",
    "eng_rate",
    "er",
    // Chinese
    "互动率",
    "engagement %",
  ],
  postingFrequency: [
    // TikTok Creator Marketplace
    "avg. posts per week",
    "posts per week",
    "videos per week",
    // TikTok ONE
    "posting frequency",
    "upload frequency",
    "content frequency",
    "weekly posts",
    "weekly uploads",
    // Generic
    "posting_frequency",
    "posts_per_week",
    "post frequency",
  ],
  contentConsistency: [
    "content consistency",
    "posting consistency",
    "consistency",
    "consistency level",
    "content_consistency",
  ],
  nicheFocus: [
    "niche focus",
    "niche level",
    "focus level",
    "category focus",
    "niche_focus",
  ],
  nicheAlignment: [
    "niche alignment",
    "category alignment",
    "category match",
    "topic alignment",
    "alignment score",
    "niche_alignment",
  ],
  followerGrowthRate: [
    // TikTok Creator Marketplace
    "follower growth rate",
    "follower growth rate (30d)",
    "growth rate",
    "30d follower growth",
    "follower growth (30d)",
    "follower growth",
    "growth rate (30d)",
  ],

  // ─── Conversion Metrics ──────────────────────────────────────────────────────
  lsTier: [
    "ls tier",
    "livestream tier",
    "live tier",
    "kalodata tier",
    "tier",
    "live commerce tier",
    "ls_tier",
    "直播层级",
  ],
  gmv30d: [
    // TikTok ONE
    "live gmv (30d)",
    "live commerce gmv (30d)",
    "total gmv (30d)",
    "gmv (30d)",
    "estimated gmv",
    "est. gmv",
    "gmv range",
    "estimated sales",
    // TikTok Creator Marketplace
    "recent gmv",
    "monthly gmv",
    "approx. gmv",
    "approx gmv",
    // Generic
    "gmv 30d",
    "gmv30d",
    "gmv_30d",
    "gmv last 30 days",
    "30d gmv",
    "sales 30d",
    "revenue 30d",
    "gmv",
    "gross merchandise value",
    // Chinese
    "30日gmv",
    "近30天gmv",
  ],
  gmv60d: [
    "gmv (60d)",
    "gmv 60d",
    "gmv60d",
    "gmv_60d",
    "gmv last 60 days",
    "60d gmv",
    // Chinese
    "60日gmv",
    "近60天gmv",
  ],
  gmv90d: [
    "gmv (90d)",
    "gmv 90d",
    "gmv90d",
    "gmv_90d",
    "gmv last 90 days",
    "90d gmv",
    "quarterly gmv",
    // Chinese
    "90日gmv",
    "近90天gmv",
  ],
  livestreamsLast30d: [
    // TikTok ONE
    "lives (30d)",
    "live count (30d)",
    "livestream count (30d)",
    "live sessions (30d)",
    "number of lives (30d)",
    "live videos (30d)",
    // Generic
    "livestreams last 30d",
    "livestream count",
    "live count",
    "livestreams",
    "lives",
    "number of livestreams",
    "live sessions",
    "live_sessions_30d",
    "livestreams_last_30d",
    // Chinese
    "直播次数",
    "近30天直播次数",
  ],
  avgGmvPerLivestream: [
    // TikTok ONE
    "avg. gmv per live",
    "avg gmv per live",
    "gmv per live (avg)",
    "average gmv per live",
    "avg live gmv",
    // Generic
    "avg gmv per livestream",
    "gmv per live",
    "live gmv avg",
    "per live gmv",
    "avg_gmv_per_livestream",
    // Chinese
    "单场gmv均值",
  ],
  shopVideoCount: [
    // TikTok ONE
    "shop videos (30d)",
    "product videos (30d)",
    "sv count (30d)",
    "shop video count (30d)",
    // Generic
    "shop video count",
    "shop videos",
    "shoppable videos",
    "product videos",
    "sv count",
    "shop_video_count",
    // Chinese
    "带货视频数",
  ],
  shopVideoViews: [
    "shop video views",
    "sv views",
    "shoppable video views",
    "product video views",
    "shop_video_views",
    // Chinese
    "带货视频播放量",
  ],
  svConversionRate: [
    "sv conversion rate",
    "shop video cvr",
    "video cvr",
    "conversion rate",
    "cvr",
    "video conversion rate",
    "sv_conversion_rate",
    // Chinese
    "带货视频转化率",
  ],
};

// Build reverse lookup: normalized alias → internal field name
const ALIAS_TO_FIELD = new Map<string, string>();
for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
  for (const alias of aliases) {
    ALIAS_TO_FIELD.set(normalizeHeader(alias), field);
  }
}

/**
 * Normalize a header string for fuzzy matching:
 * - lowercase
 * - strip leading/trailing whitespace
 * - collapse multiple spaces
 * - remove special characters (%, #, (), [], .)
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[%#()\[\]\.]/g, "")
    .replace(/_/g, " ")
    .trim();
}

export interface ColumnMapping {
  originalHeader: string;
  mappedField: string | null; // null = unrecognized
}

/**
 * Map an array of column headers to internal field names.
 */
export function mapColumns(headers: string[]): ColumnMapping[] {
  return headers.map((header) => {
    const normalized = normalizeHeader(header);
    const mappedField = ALIAS_TO_FIELD.get(normalized) ?? null;
    return { originalHeader: header, mappedField };
  });
}

/**
 * Parse a GMV value — handles:
 * - Plain numbers: "45000", "45,000", "$45,000"
 * - K/M suffixes: "45K", "1.2M", "$45K"
 * - Ranges (TikTok Creator Marketplace): "$10K-$50K", "10K~50K" → midpoint
 * - Indonesian Rupiah: "Rp 45.000.000"
 */
export function parseGmvValue(raw: string): number | null {
  if (!raw || raw.trim() === "" || raw === "-") return null;

  const s = raw.trim();

  // Range: "$10K-$50K", "10K~50K", "$10,000 - $50,000"
  const rangeMatch = s.match(/([0-9.,]+\s*[KkMmBb]?)\s*[-~–—]\s*\$?\s*([0-9.,]+\s*[KkMmBb]?)/);
  if (rangeMatch) {
    const lo = parseSingleAmount(rangeMatch[1]);
    const hi = parseSingleAmount(rangeMatch[2]);
    if (lo !== null && hi !== null) return Math.round((lo + hi) / 2);
    if (lo !== null) return lo;
    if (hi !== null) return hi;
  }

  return parseSingleAmount(s);
}

function parseSingleAmount(s: string): number | null {
  // Strip currency symbols and commas
  const cleaned = s.replace(/[$,\s¥₩฿Rp]/g, "").replace(/\./g, (_, offset, str) => {
    // Keep decimal point only if followed by 1-2 digits at end
    return str.slice(offset).match(/^\.\d{1,2}$/) ? "." : "";
  });

  // K/M/B suffixes
  const kmMatch = cleaned.match(/^([0-9.]+)\s*([KkMmBb])$/);
  if (kmMatch) {
    const num = parseFloat(kmMatch[1]);
    const suffix = kmMatch[2].toUpperCase();
    if (isNaN(num)) return null;
    if (suffix === "K") return Math.round(num * 1_000);
    if (suffix === "M") return Math.round(num * 1_000_000);
    if (suffix === "B") return Math.round(num * 1_000_000_000);
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Given column mappings, extract and transform a data row into a
 * partial Creator-shaped object.
 */
export function mapRowToCreator(
  row: Record<string, string>,
  mappings: ColumnMapping[]
): Record<string, string | number | null> {
  const result: Record<string, string | number | null> = {};

  for (const { originalHeader, mappedField } of mappings) {
    if (!mappedField) continue;
    const rawValue = row[originalHeader];
    if (rawValue === undefined || rawValue === "" || rawValue === null) {
      result[mappedField] = null;
      continue;
    }

    if (GMV_FIELDS.has(mappedField)) {
      // Use GMV-aware parser (handles ranges, K/M suffixes)
      result[mappedField] = parseGmvValue(String(rawValue));
    } else if (NUMERIC_FIELDS.has(mappedField)) {
      const cleaned = String(rawValue).replace(/[$,\s%]/g, "");
      const num = parseFloat(cleaned);
      result[mappedField] = isNaN(num) ? null : num;
    } else {
      result[mappedField] = String(rawValue).trim();
    }
  }

  return result;
}

const GMV_FIELDS = new Set([
  "gmv30d",
  "gmv60d",
  "gmv90d",
  "avgGmvPerLivestream",
]);

const NUMERIC_FIELDS = new Set([
  "followers",
  "avgViews",
  "engagementRate",
  "postingFrequency",
  "nicheAlignment",
  "followerGrowthRate",
  "gmv30d",
  "gmv60d",
  "gmv90d",
  "livestreamsLast30d",
  "avgGmvPerLivestream",
  "shopVideoCount",
  "shopVideoViews",
  "svConversionRate",
]);

/**
 * Get statistics about column matching quality for user feedback.
 */
export function getMatchStats(mappings: ColumnMapping[]): {
  matched: number;
  unrecognized: number;
  unrecognizedHeaders: string[];
} {
  const matched = mappings.filter((m) => m.mappedField !== null).length;
  const unrecognized = mappings.filter((m) => m.mappedField === null);
  return {
    matched,
    unrecognized: unrecognized.length,
    unrecognizedHeaders: unrecognized.map((m) => m.originalHeader),
  };
}
