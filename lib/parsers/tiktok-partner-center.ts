/**
 * TikTok Partner Center Export Aggregator
 *
 * Partner Center exports are row-per-ORDER (one row per transaction).
 * This module detects that format, then aggregates all orders by creator
 * into creator-level metrics ready for scoring.
 *
 * Handles both:
 * - Affiliate order exports (affiliate_orders_*.xlsx)
 * - Agency commission reports (all_*.xlsx)
 */

import { Creator, Platform } from "@/types/creator";

// ─── Column detection ─────────────────────────────────────────────────────────

// Each entry: variants we accept for that semantic column
const PC_COLS = {
  creator: [
    "creator username",
    "creator name",
    "tiktoker",
    "tiktoker username",
    "username",
    "influencer",
    "affiliate",
    "affiliate name",
  ],
  gmv: [
    "commission gmv",
    "gmv",
    "gross merchandise value",
    "commission gmv (usd)",
    "gmv (usd)",
    "order gmv",
    "sales amount",
  ],
  contentType: [
    "content type",
    "order type",
    "source type",
    "order source",
    "type",
    "live/video",
  ],
  date: [
    "time created",
    "order time",
    "created time",
    "order date",
    "date",
    "created at",
    "order created time",
  ],
  shop: ["shop name", "shop", "store name", "store"],
  settlementStatus: ["order settlement status", "settlement status", "status"],
};

function normalizeH(h: string): string {
  return h.toLowerCase().trim().replace(/\s+/g, " ").replace(/[()[\]%#]/g, "").trim();
}

/** Find the actual column header from a list of accepted variants */
function findCol(headers: string[], variants: string[]): string | null {
  for (const header of headers) {
    const n = normalizeH(header);
    if (variants.some((v) => n === v || n.includes(v))) {
      return header;
    }
  }
  return null;
}

/**
 * Returns true if this file looks like a TikTok Partner Center order export.
 * Requires: a creator column AND a GMV column AND (a content type OR date column).
 */
export function isTikTokPartnerCenterFormat(headers: string[]): boolean {
  const hasCreator = !!findCol(headers, PC_COLS.creator);
  const hasGmv = !!findCol(headers, PC_COLS.gmv);
  const hasContentType = !!findCol(headers, PC_COLS.contentType);
  const hasDate = !!findCol(headers, PC_COLS.date);
  return hasCreator && hasGmv && (hasContentType || hasDate);
}

// ─── Parsing helpers ──────────────────────────────────────────────────────────

function parseAmount(value: string): number {
  const cleaned = String(value ?? "0")
    .replace(/[$,\s¥₩฿Rp]/g, "")
    .replace(/[()]/g, ""); // strip negatives in parens
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.max(0, num);
}

function parseDate(value: string): Date | null {
  if (!value || !value.trim()) return null;
  // Normalise separators and try native parser
  const normalised = value.trim().replace(/\//g, "-");
  const d = new Date(normalised);
  return isNaN(d.getTime()) ? null : d;
}

function isLivestream(contentType: string): boolean {
  const v = (contentType ?? "").toLowerCase().trim();
  return v.includes("live") || v === "ls";
}

function isVideo(contentType: string): boolean {
  const v = (contentType ?? "").toLowerCase().trim();
  return v.includes("video") || v.includes("short") || v === "sv";
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

interface OrderRow {
  gmv: number;
  contentType: string;
  date: Date | null;
}

export interface AggregateResult {
  creators: Creator[];
  /** Total order rows processed */
  totalRows: number;
  /** Number of distinct creators found */
  creatorCount: number;
  /** Reference date used for 30/60/90d windows */
  referenceDate: Date;
  /** Column names detected */
  detectedColumns: Record<string, string>;
}

/**
 * Aggregate Partner Center order rows into per-creator scored metrics.
 *
 * @param rows - array of raw row objects (string values from Excel/CSV)
 * @returns AggregateResult with Creator[] ready for scoring
 */
export function aggregatePartnerCenterRows(
  rows: Record<string, string>[]
): AggregateResult {
  if (rows.length === 0) {
    return {
      creators: [],
      totalRows: 0,
      creatorCount: 0,
      referenceDate: new Date(),
      detectedColumns: {},
    };
  }

  const headers = Object.keys(rows[0]);

  // Detect columns
  const colCreator = findCol(headers, PC_COLS.creator);
  const colGmv = findCol(headers, PC_COLS.gmv);
  const colContentType = findCol(headers, PC_COLS.contentType);
  const colDate = findCol(headers, PC_COLS.date);

  const detectedColumns: Record<string, string> = {};
  if (colCreator) detectedColumns.creator = colCreator;
  if (colGmv) detectedColumns.gmv = colGmv;
  if (colContentType) detectedColumns.contentType = colContentType;
  if (colDate) detectedColumns.date = colDate;

  if (!colCreator || !colGmv) {
    return {
      creators: [],
      totalRows: rows.length,
      creatorCount: 0,
      referenceDate: new Date(),
      detectedColumns,
    };
  }

  // Group orders by creator
  const byCreator = new Map<string, OrderRow[]>();

  for (const row of rows) {
    const rawHandle = colCreator ? (row[colCreator] ?? "").trim().replace(/^@/, "") : "";
    if (!rawHandle) continue;

    const handle = rawHandle;
    const gmv = colGmv ? parseAmount(row[colGmv]) : 0;
    const contentType = colContentType ? (row[colContentType] ?? "") : "";
    const date = colDate ? parseDate(row[colDate]) : null;

    if (!byCreator.has(handle)) byCreator.set(handle, []);
    byCreator.get(handle)!.push({ gmv, contentType, date });
  }

  // Find reference date = most recent date in dataset (= "today" for the export)
  let referenceDate = new Date();
  let latestTs = 0;
  for (const orders of byCreator.values()) {
    for (const { date } of orders) {
      if (date && date.getTime() > latestTs) {
        latestTs = date.getTime();
        referenceDate = date;
      }
    }
  }

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const inWindow = (date: Date | null, days: number): boolean => {
    if (!date) return false;
    return referenceDate.getTime() - date.getTime() <= days * MS_PER_DAY;
  };

  // Build Creator objects
  const creators: Creator[] = [];

  for (const [handle, orders] of byCreator.entries()) {
    const hasDates = orders.some((o) => o.date !== null);

    // GMV windows — if no dates in export, treat all orders as 30d
    const gmv30 = hasDates
      ? orders.filter((o) => inWindow(o.date, 30)).reduce((s, o) => s + o.gmv, 0)
      : orders.reduce((s, o) => s + o.gmv, 0);

    const gmv60 = hasDates
      ? orders.filter((o) => inWindow(o.date, 60)).reduce((s, o) => s + o.gmv, 0)
      : gmv30;

    const gmv90 = hasDates
      ? orders.filter((o) => inWindow(o.date, 90)).reduce((s, o) => s + o.gmv, 0)
      : gmv60;

    // Livestream count in last 30d
    // Count distinct days that had live orders (each distinct day ≈ 1 session)
    const liveOrders30 = hasDates
      ? orders.filter((o) => inWindow(o.date, 30) && isLivestream(o.contentType))
      : orders.filter((o) => isLivestream(o.contentType));

    const liveDays = new Set(
      liveOrders30.map((o) =>
        o.date ? o.date.toISOString().split("T")[0] : "unknown"
      )
    );
    const livestreamsLast30d = liveDays.size || (liveOrders30.length > 0 ? 1 : 0);

    // Shop video count — distinct video-type orders across full dataset
    const videoOrders = orders.filter((o) => isVideo(o.contentType));
    const videoDays = new Set(
      videoOrders.map((o) =>
        o.date ? o.date.toISOString().split("T")[0] : "unknown"
      )
    );
    const shopVideoCount = videoDays.size || videoOrders.length;

    // Average GMV per livestream
    const avgGmvPerLivestream =
      livestreamsLast30d > 0 ? gmv30 / livestreamsLast30d : undefined;

    creators.push({
      id: `pc-${handle}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      handle,
      platform: Platform.TikTok,
      gmv30d: gmv30 > 0 ? Math.round(gmv30) : undefined,
      gmv60d: gmv60 > 0 ? Math.round(gmv60) : undefined,
      gmv90d: gmv90 > 0 ? Math.round(gmv90) : undefined,
      livestreamsLast30d: livestreamsLast30d > 0 ? livestreamsLast30d : undefined,
      avgGmvPerLivestream: avgGmvPerLivestream
        ? Math.round(avgGmvPerLivestream)
        : undefined,
      shopVideoCount: shopVideoCount > 0 ? shopVideoCount : undefined,
    });
  }

  // Sort by GMV30d descending so top creators appear first in the queue
  creators.sort((a, b) => (b.gmv30d ?? 0) - (a.gmv30d ?? 0));

  return {
    creators,
    totalRows: rows.length,
    creatorCount: creators.length,
    referenceDate,
    detectedColumns,
  };
}
