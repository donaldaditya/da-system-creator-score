/**
 * Shopee Affiliate Conversion Report parser — Task 3, Path 4
 *
 * File pattern: ConversionReport_YYYYMMDDHHSS.csv
 * Detected by: "Affiliate Username" + "Purchase Value(Rp)" columns
 *
 * Aggregates per creator:
 * - Total Shopee GMV (Completed orders only, IDR)
 * - Order count (Completed only)
 * - Avg order value
 * - Channel mix % (Instagram / TikTok / Shopeevideo / Facebook / Others)
 * - CTOR: Completed orders / total rows (each row = 1 click)
 * - IG→Shopee conv rate: Completed orders from Instagram / total orders
 * - Commission (creator + MCN)
 */

import { Creator, Platform } from "@/types/creator";

const COL = {
  handle:       ["affiliate username", "username", "affiliate"],
  purchaseValue:["purchase value(rp)", "purchase value (rp)", "purchase value", "gmv (rp)", "gmv"],
  orderStatus:  ["order status", "status"],
  channel:      ["channel", "traffic source", "source"],
  clickTime:    ["click time", "click date", "date"],
  affiliateComm:["affiliate net commission (rp)(rp)", "affiliate net commission (rp)", "affiliate commission", "affiliate net commission"],
  mcnComm:      ["mcn net commission(rp)", "mcn net commission (rp)", "mcn commission"],
};

function normalizeH(h: string): string {
  return h.toLowerCase().trim().replace(/\s+/g, " ").replace(/[()[\]%#]/g, "").trim();
}

function findCol(headers: string[], variants: string[]): string | null {
  for (const h of headers) {
    const n = normalizeH(h);
    if (variants.some((v) => n === normalizeH(v) || n.includes(normalizeH(v)))) return h;
  }
  return null;
}

function parseAmount(v: string): number {
  const n = parseFloat(String(v ?? "0").replace(/[Rp,.\s]/g, "").replace(/[^\d-]/g, ""));
  return isNaN(n) ? 0 : Math.max(0, n);
}

const COMPLETED_STATUSES = new Set(["completed", "complete", "settled", "paid", "confirmed"]);
const CANCELLED_STATUSES  = new Set(["cancelled", "canceled", "refunded", "returned", "pending"]);

export function isShopeeFormat(headers: string[]): boolean {
  const hasHandle  = !!findCol(headers, COL.handle);
  const hasPurchase = headers.some((h) => normalizeH(h).includes("purchase value"));
  return hasHandle && hasPurchase;
}

export interface ShopeeAggResult {
  creators: Creator[];
  totalRows: number;
  creatorCount: number;
  detectedColumns: Record<string, string>;
}

export function aggregateShopeeRows(rows: Record<string, string>[]): ShopeeAggResult {
  if (!rows.length) return { creators: [], totalRows: 0, creatorCount: 0, detectedColumns: {} };

  const headers = Object.keys(rows[0]);

  const colHandle = findCol(headers, COL.handle);
  const colValue  = findCol(headers, COL.purchaseValue);
  const colStatus = findCol(headers, COL.orderStatus);
  const colChannel= findCol(headers, COL.channel);
  const colAffilComm = findCol(headers, COL.affiliateComm);
  const colMcnComm   = findCol(headers, COL.mcnComm);

  const detected: Record<string, string> = {};
  if (colHandle)  detected.handle    = colHandle;
  if (colValue)   detected.gmv       = colValue;
  if (colStatus)  detected.status    = colStatus;
  if (colChannel) detected.channel   = colChannel;

  if (!colHandle || !colValue) return { creators: [], totalRows: rows.length, creatorCount: 0, detectedColumns: detected };

  interface CreatorBucket {
    totalClicks: number;
    completedOrders: number;
    gmvIDR: number;
    channels: Record<string, number>;       // channel → completed order count
    channelClicks: Record<string, number>;  // channel → total clicks
    affiliateCommission: number;
    mcnCommission: number;
  }

  const byCreator = new Map<string, CreatorBucket>();

  for (const row of rows) {
    const handle = (row[colHandle] ?? "").trim().replace(/^@/, "");
    if (!handle) continue;

    if (!byCreator.has(handle)) {
      byCreator.set(handle, {
        totalClicks: 0, completedOrders: 0, gmvIDR: 0,
        channels: {}, channelClicks: {}, affiliateCommission: 0, mcnCommission: 0,
      });
    }
    const b = byCreator.get(handle)!;
    b.totalClicks++;

    const statusRaw = colStatus ? (row[colStatus] ?? "").toLowerCase().trim() : "completed";
    const isCompleted = !colStatus || COMPLETED_STATUSES.has(statusRaw) || !CANCELLED_STATUSES.has(statusRaw);
    const channel = colChannel ? (row[colChannel] ?? "Other").trim() : "Other";

    b.channelClicks[channel] = (b.channelClicks[channel] ?? 0) + 1;

    if (isCompleted) {
      const gmv = parseAmount(colValue ? row[colValue] : "0");
      b.completedOrders++;
      b.gmvIDR += gmv;
      b.channels[channel] = (b.channels[channel] ?? 0) + 1;
      if (colAffilComm) b.affiliateCommission += parseAmount(row[colAffilComm]);
      if (colMcnComm)   b.mcnCommission       += parseAmount(row[colMcnComm]);
    }
  }

  const creators: Creator[] = [];

  for (const [handle, b] of byCreator.entries()) {
    const ctor = b.totalClicks > 0 ? (b.completedOrders / b.totalClicks) * 100 : undefined;
    const avgOrderValue = b.completedOrders > 0 ? b.gmvIDR / b.completedOrders : undefined;

    // Channel mix as %
    const totalOrders = b.completedOrders || 1;
    const channelMix: Record<string, number> = {};
    for (const [ch, cnt] of Object.entries(b.channels)) {
      channelMix[ch] = Math.round((cnt / totalOrders) * 100);
    }

    // Instagram→Shopee conversion rate
    const igOrders  = b.channels["Instagram"] ?? b.channels["instagram"] ?? 0;
    const igClicks  = b.channelClicks["Instagram"] ?? b.channelClicks["instagram"] ?? 0;
    const igConvRate = igClicks > 0 ? (igOrders / igClicks) * 100 : undefined;

    const topChannel = Object.entries(b.channels).sort((a, b) => b[1] - a[1])[0]?.[0];

    creators.push({
      id: `shopee-${handle}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      handle,
      platform: Platform.Shopee,
      shopeeGmv30d: b.gmvIDR > 0 ? Math.round(b.gmvIDR) : undefined,
      gmv30d:       b.gmvIDR > 0 ? Math.round(b.gmvIDR) : undefined,
      orders30d:    b.completedOrders || undefined,
      ctor,
      avgOrderValue,
      channelMix: Object.keys(channelMix).length ? channelMix : undefined,
      instagramShopeeConvRate: igConvRate,
      topContentType: topChannel,
      sources: [Platform.Shopee],
    });
  }

  creators.sort((a, b) => (b.gmv30d ?? 0) - (a.gmv30d ?? 0));

  return { creators, totalRows: rows.length, creatorCount: creators.length, detectedColumns: detected };
}
