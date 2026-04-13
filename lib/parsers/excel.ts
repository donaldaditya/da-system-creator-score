import * as XLSX from "xlsx";
import { Creator } from "@/types/creator";
import { mapColumns, mapRowToCreator, getMatchStats, ColumnMapping } from "./schema-mapper";
import { ParseResult } from "./csv";
import { isTikTokPartnerCenterFormat, aggregatePartnerCenterRows } from "./tiktok-partner-center";

// Re-use the row-to-creator logic from csv.ts via a shared helper
import {
  Platform,
  Category,
  LSTier,
  ContentConsistencyLevel,
  NicheFocusLevel,
} from "@/types/creator";

/**
 * Parse an Excel file (.xlsx, .xls) into Creator objects.
 * Reads the first sheet by default.
 *
 * @param file - File object from input element or drag-and-drop
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        // Use first sheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          resolve({
            creators: [],
            mappings: [],
            matchStats: { matched: 0, unrecognized: 0, unrecognizedHeaders: [] },
            errors: ["Excel file has no sheets"],
            rawHeaders: [],
          });
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        // Convert to array of objects with header: 1 to get headers from first row
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, {
          raw: false, // Convert to strings for consistent handling
          defval: "",
        });

        if (jsonData.length === 0) {
          resolve({
            creators: [],
            mappings: [],
            matchStats: { matched: 0, unrecognized: 0, unrecognizedHeaders: [] },
            errors: ["Sheet is empty"],
            rawHeaders: [],
          });
          return;
        }

        const rawHeaders = Object.keys(jsonData[0]);

        // Convert all rows to string maps once
        const stringRows: Record<string, string>[] = jsonData.map((row) => {
          const r: Record<string, string> = {};
          for (const [k, v] of Object.entries(row)) r[k] = String(v ?? "");
          return r;
        });

        // ── TikTok Partner Center detection ──────────────────────────────────
        if (isTikTokPartnerCenterFormat(rawHeaders)) {
          const agg = aggregatePartnerCenterRows(stringRows);
          resolve({
            creators: agg.creators,
            mappings: [],
            matchStats: { matched: 0, unrecognized: 0, unrecognizedHeaders: [] },
            errors: agg.creators.length === 0 ? ["No creators found in Partner Center export"] : [],
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
        const errors: string[] = [];

        const creators: Creator[] = stringRows
          .map((row, i) => {
            try {
              return excelRowToCreator(row, mappings, i);
            } catch (e) {
              errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : String(e)}`);
              return null;
            }
          })
          .filter((c): c is Creator => c !== null);

        resolve({ creators, mappings, matchStats, errors, rawHeaders });
      } catch (e) {
        resolve({
          creators: [],
          mappings: [],
          matchStats: { matched: 0, unrecognized: 0, unrecognizedHeaders: [] },
          errors: [e instanceof Error ? e.message : "Failed to parse Excel file"],
          rawHeaders: [],
        });
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsArrayBuffer(file);
  });
}

function excelRowToCreator(
  row: Record<string, string>,
  mappings: ColumnMapping[],
  index: number
): Creator {
  const mapped = mapRowToCreator(row, mappings);

  const id = `xlsx-${index}-${Date.now()}`;
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

// ─── Normalizers (duplicated for isolation — could be extracted to shared util) ──

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

/**
 * Build an Excel export workbook from scored creators.
 * Sheet 1: Full list with all scores
 * Sheet 2: Score breakdown per creator
 * Sheet 3: Top 10 summary
 */
export function buildExportWorkbook(scoredCreators: import("@/types/creator").ScoredCreator[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Full list
  const fullListData = scoredCreators.map((c, i) => ({
    "#": i + 1,
    Handle: c.handle,
    Platform: c.platform,
    Category: c.category || "",
    "LS Tier": c.lsTier || c.conversion.inferredLsTier || "",
    "Branding Score": c.branding.total,
    "Conversion Score": c.conversion.total,
    "Composite Score": c.composite.total,
    Tags: c.tags.join(", "),
    Followers: c.followers || "",
    "Engagement Rate %": c.engagementRate || "",
    "GMV 30d": c.gmv30d || "",
  }));
  const ws1 = XLSX.utils.json_to_sheet(fullListData);
  XLSX.utils.book_append_sheet(wb, ws1, "All Creators");

  // Sheet 2: Score breakdown
  const breakdownData = scoredCreators.map((c) => ({
    Handle: c.handle,
    "Composite Score": c.composite.total,
    "Branding Total": c.branding.total,
    "ER Score": c.branding.signals.engagementRate?.normalizedScore ?? "",
    "ER Weight": c.branding.signals.engagementRate?.weight ?? "",
    "View/Follower Score": c.branding.signals.viewToFollower?.normalizedScore ?? "",
    "Consistency Score": c.branding.signals.contentConsistency?.normalizedScore ?? "",
    "Follower Base Score": c.branding.signals.followerBase?.normalizedScore ?? "",
    "Niche Score": c.branding.signals.nicheAlignment?.normalizedScore ?? "",
    "Conversion Total": c.conversion.total,
    "LS Tier Score": c.conversion.signals.lsTier?.normalizedScore ?? "",
    "GMV Trend Score": c.conversion.signals.gmvTrend?.normalizedScore ?? "",
    "GMV/LS Score": c.conversion.signals.gmvPerLivestream?.normalizedScore ?? "",
    "SV Efficiency Score": c.conversion.signals.svEfficiency?.normalizedScore ?? "",
    "LS Freq Score": c.conversion.signals.livestreamFrequency?.normalizedScore ?? "",
    "Branding Completeness %": Math.round(c.branding.dataCompleteness * 100),
    "Conversion Completeness %": Math.round(c.conversion.dataCompleteness * 100),
  }));
  const ws2 = XLSX.utils.json_to_sheet(breakdownData);
  XLSX.utils.book_append_sheet(wb, ws2, "Score Breakdown");

  // Sheet 3: Top 10 summary
  const top10 = scoredCreators.slice(0, 10);
  const summaryData = top10.map((c, i) => ({
    Rank: i + 1,
    Handle: c.handle,
    Platform: c.platform,
    "Composite Score": c.composite.total,
    "Branding Score": c.branding.total,
    "Conversion Score": c.conversion.total,
    "LS Tier": c.lsTier || c.conversion.inferredLsTier || "",
    Tags: c.tags.join(", "),
    Recommendation: c.tags.length > 0 ? `Strong candidate: ${c.tags[0]}` : "Standard candidate",
  }));
  const ws3 = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws3, "Top 10 Summary");

  return wb;
}
