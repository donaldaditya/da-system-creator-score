import Papa from "papaparse";
import { Creator, Platform, Category, LSTier, ContentConsistencyLevel, NicheFocusLevel } from "@/types/creator";
import { mapColumns, mapRowToCreator, getMatchStats, ColumnMapping } from "./schema-mapper";
import { isTikTokPartnerCenterFormat, aggregatePartnerCenterRows } from "./tiktok-partner-center";

export interface PartnerCenterMeta {
  totalRows: number;
  creatorCount: number;
  referenceDate: Date;
  detectedColumns: Record<string, string>;
}

export interface ParseResult {
  creators: Creator[];
  mappings: ColumnMapping[];
  matchStats: ReturnType<typeof getMatchStats>;
  errors: string[];
  rawHeaders: string[];
  /** True when file was detected as a TikTok Partner Center order export */
  isPartnerCenter?: boolean;
  /** Only present when isPartnerCenter is true */
  partnerCenterMeta?: PartnerCenterMeta;
}

/**
 * Parse a CSV file into Creator objects.
 * Uses PapaParse for robust CSV handling (handles quoted fields, various delimiters).
 *
 * @param file - File object from input element or drag-and-drop
 */
export async function parseCsvFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // We handle type coercion in schema-mapper
      complete: (results) => {
        const rawHeaders = results.meta.fields ?? [];
        const parseErrors: string[] = results.errors.map((e) => `Row ${e.row}: ${e.message}`);

        // ── TikTok Partner Center detection ──────────────────────────────────
        if (isTikTokPartnerCenterFormat(rawHeaders)) {
          const agg = aggregatePartnerCenterRows(results.data as Record<string, string>[]);
          resolve({
            creators: agg.creators,
            mappings: [],
            matchStats: { matched: 0, unrecognized: 0, unrecognizedHeaders: [] },
            errors: agg.creators.length === 0 ? ["No creators found in Partner Center export"] : parseErrors,
            rawHeaders,
            isPartnerCenter: true,
            partnerCenterMeta: {
              totalRows: agg.totalRows,
              creatorCount: agg.creatorCount,
              referenceDate: agg.referenceDate,
              detectedColumns: agg.detectedColumns,
            },
          });
          return;
        }

        // ── Standard creator-per-row format ──────────────────────────────────
        const mappings = mapColumns(rawHeaders);
        const matchStats = getMatchStats(mappings);

        const creators: Creator[] = results.data
          .map((row, i) => {
            try {
              return rowToCreator(row as Record<string, string>, mappings, i);
            } catch (e) {
              parseErrors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : String(e)}`);
              return null;
            }
          })
          .filter((c): c is Creator => c !== null);

        resolve({ creators, mappings, matchStats, errors: parseErrors, rawHeaders });
      },
      error: (error) => {
        resolve({
          creators: [],
          mappings: [],
          matchStats: { matched: 0, unrecognized: 0, unrecognizedHeaders: [] },
          errors: [error.message],
          rawHeaders: [],
        });
      },
    });
  });
}

/**
 * Parse CSV string directly (useful for template previews)
 */
export async function parseCsvString(csvString: string): Promise<ParseResult> {
  const blob = new Blob([csvString], { type: "text/csv" });
  const file = new File([blob], "data.csv", { type: "text/csv" });
  return parseCsvFile(file);
}

/**
 * Convert a mapped row object to a Creator
 */
function rowToCreator(
  row: Record<string, string>,
  mappings: ColumnMapping[],
  index: number
): Creator {
  const mapped = mapRowToCreator(row, mappings);

  const id = `csv-${index}-${Date.now()}`;
  const handle = (mapped.handle as string) || `creator_${index + 1}`;

  return {
    id,
    handle,
    platform: normalizePlatform(mapped.platform as string | null),
    category: normalizeCategory(mapped.category as string | null),
    profileUrl: (mapped.profileUrl as string) || undefined,
    avatarUrl: (mapped.avatarUrl as string) || undefined,

    // Branding
    followers: mapped.followers as number | undefined,
    avgViews: mapped.avgViews as number | undefined,
    engagementRate: mapped.engagementRate as number | undefined,
    postingFrequency: mapped.postingFrequency as number | undefined,
    contentConsistency: normalizeConsistency(mapped.contentConsistency as string | null),
    nicheFocus: normalizeNicheFocus(mapped.nicheFocus as string | null),
    nicheAlignment: mapped.nicheAlignment as number | undefined,

    // Conversion
    lsTier: normalizeLsTier(mapped.lsTier as string | null),
    gmv30d: mapped.gmv30d as number | undefined,
    gmv60d: mapped.gmv60d as number | undefined,
    gmv90d: mapped.gmv90d as number | undefined,
    livestreamsLast30d: mapped.livestreamsLast30d as number | undefined,
    avgGmvPerLivestream: mapped.avgGmvPerLivestream as number | undefined,
    shopVideoCount: mapped.shopVideoCount as number | undefined,
    shopVideoViews: mapped.shopVideoViews as number | undefined,
    svConversionRate: mapped.svConversionRate as number | undefined,

    rawRow: row,
  };
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normalizePlatform(value: string | null): Platform {
  if (!value) return Platform.TikTok;
  const v = value.toLowerCase();
  if (v.includes("insta") || v === "ig") return Platform.Instagram;
  if (v.includes("shopee")) return Platform.Shopee;
  return Platform.TikTok;
}

function normalizeCategory(value: string | null): Category | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase().trim();
  const map: Record<string, Category> = {
    beauty: Category.Beauty,
    fashion: Category.Fashion,
    food: Category.Food,
    tech: Category.Tech,
    technology: Category.Tech,
    lifestyle: Category.Lifestyle,
    gaming: Category.Gaming,
    finance: Category.Finance,
    health: Category.Health,
    travel: Category.Travel,
    parenting: Category.Parenting,
    sports: Category.Sports,
    entertainment: Category.Entertainment,
    education: Category.Education,
  };
  return map[v] || Category.Other;
}

function normalizeLsTier(value: string | null): LSTier | undefined {
  if (!value) return undefined;
  const v = value.toUpperCase().trim();
  if (Object.values(LSTier).includes(v as LSTier)) {
    return v as LSTier;
  }
  return undefined;
}

function normalizeConsistency(value: string | null): ContentConsistencyLevel | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase().trim();
  if (v === "high") return ContentConsistencyLevel.High;
  if (v === "medium" || v === "mid") return ContentConsistencyLevel.Medium;
  if (v === "low") return ContentConsistencyLevel.Low;
  return undefined;
}

function normalizeNicheFocus(value: string | null): NicheFocusLevel | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase().trim();
  if (v === "high") return NicheFocusLevel.High;
  if (v === "medium" || v === "mid") return NicheFocusLevel.Medium;
  if (v === "low") return NicheFocusLevel.Low;
  return undefined;
}
