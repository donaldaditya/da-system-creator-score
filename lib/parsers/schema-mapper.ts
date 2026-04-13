/**
 * Fuzzy column header mapper.
 *
 * Maps common CSV/Excel column name variants to internal Creator field names.
 * Handles TikTok native exports, Kalodata exports, and manual entry formats.
 */

// Map of internal field name → array of accepted column header variants
// Sorted roughly from most specific to most generic
const COLUMN_ALIASES: Record<string, string[]> = {
  // Identity
  handle: [
    "handle",
    "username",
    "tiktok_handle",
    "instagram_handle",
    "creator_handle",
    "tiktok username",
    "ig handle",
    "@handle",
    "account",
    "creator",
    "creator name",
    "tiktok id",
    "profile",
  ],
  platform: [
    "platform",
    "social platform",
    "channel",
    "network",
  ],
  category: [
    "category",
    "niche",
    "vertical",
    "content category",
    "creator category",
    "industry",
    "topic",
  ],
  profileUrl: [
    "profile_url",
    "profile url",
    "url",
    "link",
    "tiktok url",
    "instagram url",
    "profile link",
    "creator url",
    "page url",
  ],
  avatarUrl: [
    "avatar_url",
    "avatar url",
    "profile photo",
    "photo url",
    "image url",
    "thumbnail",
  ],

  // Branding Metrics
  followers: [
    "followers",
    "follower_count",
    "follower count",
    "total followers",
    "fans",
    "fan count",
    "audience size",
    "following_count",
    "followers count",
    "粉丝数",
    "粉丝",
  ],
  avgViews: [
    "avg_views",
    "average_views",
    "average views",
    "avg views",
    "avg_video_views",
    "average video views",
    "views_avg",
    "mean views",
    "views per post",
    "avg views per video",
    "平均播放量",
  ],
  engagementRate: [
    "engagement_rate",
    "engagement rate",
    "er",
    "eng_rate",
    "avg_engagement_rate",
    "average engagement rate",
    "interaction rate",
    "互动率",
    "engagement %",
  ],
  postingFrequency: [
    "posting_frequency",
    "posting frequency",
    "posts_per_week",
    "posts per week",
    "post frequency",
    "upload frequency",
    "videos_per_week",
    "videos per week",
    "weekly posts",
    "content frequency",
  ],
  contentConsistency: [
    "content_consistency",
    "content consistency",
    "posting consistency",
    "consistency",
    "consistency level",
  ],
  nicheFocus: [
    "niche_focus",
    "niche focus",
    "niche level",
    "focus level",
    "category focus",
  ],
  nicheAlignment: [
    "niche_alignment",
    "niche alignment",
    "category alignment",
    "category match",
    "topic alignment",
    "alignment score",
  ],

  // Conversion Metrics
  lsTier: [
    "ls_tier",
    "ls tier",
    "livestream tier",
    "live tier",
    "kalodata tier",
    "tier",
    "live commerce tier",
    "直播层级",
  ],
  gmv30d: [
    "gmv_30d",
    "gmv30d",
    "gmv 30d",
    "gmv last 30 days",
    "gmv (30 days)",
    "30d gmv",
    "monthly gmv",
    "gmv",
    "gross merchandise value",
    "sales 30d",
    "revenue 30d",
    "30日GMV",
    "近30天GMV",
  ],
  gmv60d: [
    "gmv_60d",
    "gmv60d",
    "gmv 60d",
    "gmv last 60 days",
    "gmv (60 days)",
    "60d gmv",
    "60日GMV",
    "近60天GMV",
  ],
  gmv90d: [
    "gmv_90d",
    "gmv90d",
    "gmv 90d",
    "gmv last 90 days",
    "gmv (90 days)",
    "90d gmv",
    "quarterly gmv",
    "90日GMV",
    "近90天GMV",
  ],
  livestreamsLast30d: [
    "livestreams_last_30d",
    "livestreams last 30d",
    "livestream_count",
    "livestream count",
    "live count",
    "lives",
    "number of livestreams",
    "live sessions",
    "live_sessions_30d",
    "直播次数",
    "近30天直播次数",
  ],
  avgGmvPerLivestream: [
    "avg_gmv_per_livestream",
    "avg gmv per livestream",
    "gmv per live",
    "gmv_per_live",
    "average gmv per live",
    "live gmv avg",
    "per live gmv",
    "单场GMV均值",
  ],
  shopVideoCount: [
    "shop_video_count",
    "shop video count",
    "shoppable videos",
    "product videos",
    "sv count",
    "shop videos",
    "带货视频数",
  ],
  shopVideoViews: [
    "shop_video_views",
    "shop video views",
    "sv views",
    "shoppable video views",
    "product video views",
    "带货视频播放量",
  ],
  svConversionRate: [
    "sv_conversion_rate",
    "sv conversion rate",
    "shop video cvr",
    "video cvr",
    "conversion rate",
    "cvr",
    "video conversion rate",
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
 * - remove special characters (%, #, etc.)
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[%#()\[\]]/g, "")
    .replace(/_/g, " ")
    .trim();
}

export interface ColumnMapping {
  originalHeader: string;
  mappedField: string | null; // null = unrecognized
}

/**
 * Map an array of column headers to internal field names.
 *
 * @param headers - array of raw column headers from the file
 * @returns array of ColumnMapping objects
 */
export function mapColumns(headers: string[]): ColumnMapping[] {
  return headers.map((header) => {
    const normalized = normalizeHeader(header);
    const mappedField = ALIAS_TO_FIELD.get(normalized) ?? null;
    return { originalHeader: header, mappedField };
  });
}

/**
 * Given column mappings, extract and transform a data row into a
 * partial Creator-shaped object (string/number values, nulls for missing).
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

    // Attempt numeric coercion for known numeric fields
    if (NUMERIC_FIELDS.has(mappedField)) {
      const cleaned = String(rawValue).replace(/[$,\s%]/g, "");
      const num = parseFloat(cleaned);
      result[mappedField] = isNaN(num) ? null : num;
    } else {
      result[mappedField] = String(rawValue).trim();
    }
  }

  return result;
}

const NUMERIC_FIELDS = new Set([
  "followers",
  "avgViews",
  "engagementRate",
  "postingFrequency",
  "nicheAlignment",
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
