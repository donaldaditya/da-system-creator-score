/**
 * Commerce scorer — Task 2
 *
 * Signals:
 *   GMV  (35%) — total cross-platform GMV in IDR, log-normalized, cap IDR 500M/month
 *   CTR  (30%) — click-through rate %, cap 15%
 *   CTOR (35%) — click-to-order rate % (orders/clicks), cap 30%
 *
 * CTOR derivation: if column absent but Orders + Clicks present → derive
 * If click data missing entirely → GMV only at 60% weight, CTOR flagged N/A
 */

import { Creator, ConversionScore, LSTier, SignalScore } from "@/types/creator";
import { SCORING_CONFIG } from "@/constants/scoring-config";
import { classifyLsTier } from "./ls-tier";

const W = SCORING_CONFIG.commerce.weights;
const B = SCORING_CONFIG.commerce.benchmarks;
const TIER_SCORES = SCORING_CONFIG.lsTierScores;

type SignalKey = keyof typeof W;

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normalizeGmv(idr: number): number {
  if (idr <= 0) return 0;
  if (idr >= B.gmv.capIDR) return 100;
  const logVal = Math.log10(Math.max(idr, B.gmv.weakIDR));
  const logMin = Math.log10(B.gmv.weakIDR);
  const logMax = Math.log10(B.gmv.capIDR);
  return Math.min(100, Math.max(0, ((logVal - logMin) / (logMax - logMin)) * 100));
}

function normalizeCtr(ctr: number): number {
  if (ctr <= 0) return 0;
  if (ctr >= B.ctr.capRate) return 100;
  if (ctr >= B.ctr.strong)  return 75 + ((ctr - B.ctr.strong)  / (B.ctr.capRate - B.ctr.strong))  * 25;
  if (ctr >= B.ctr.average) return 50 + ((ctr - B.ctr.average) / (B.ctr.strong   - B.ctr.average)) * 25;
  if (ctr >= B.ctr.weak)    return 20 + ((ctr - B.ctr.weak)    / (B.ctr.average  - B.ctr.weak))    * 30;
  return (ctr / B.ctr.weak) * 20;
}

function normalizeCtor(ctor: number): number {
  if (ctor <= 0) return 0;
  if (ctor >= B.ctor.capRate) return 100;
  if (ctor >= B.ctor.strong)  return 75 + ((ctor - B.ctor.strong)  / (B.ctor.capRate - B.ctor.strong))  * 25;
  if (ctor >= B.ctor.average) return 50 + ((ctor - B.ctor.average) / (B.ctor.strong   - B.ctor.average)) * 25;
  if (ctor >= B.ctor.weak)    return 20 + ((ctor - B.ctor.weak)    / (B.ctor.average  - B.ctor.weak))    * 30;
  return (ctor / B.ctor.weak) * 20;
}

// ─── Main scorer ──────────────────────────────────────────────────────────────

export function computeConversionScore(creator: Creator): ConversionScore {
  // Derive CTOR if not provided
  let ctorValue: number | null = creator.ctor ?? null;
  if (ctorValue == null && creator.orders30d != null && creator.clicks30d != null && creator.clicks30d > 0) {
    ctorValue = (creator.orders30d / creator.clicks30d) * 100;
  }

  const clickDataMissing = creator.ctr == null && creator.clicks30d == null && ctorValue == null;
  const ctorMissing = ctorValue == null;

  const rawMap: Record<SignalKey, number | null> = {
    gmv:  creator.gmv30d ?? null,
    ctr:  creator.ctr ?? null,
    ctor: ctorValue,
  };

  const normalizedMap: Record<SignalKey, number | null> = {
    gmv:  rawMap.gmv  != null ? normalizeGmv(rawMap.gmv)   : null,
    ctr:  rawMap.ctr  != null ? normalizeCtr(rawMap.ctr)   : null,
    ctor: rawMap.ctor != null ? normalizeCtor(rawMap.ctor) : null,
  };

  // If click data missing entirely → GMV-only mode at 60% effective weight
  let effectiveW: Record<SignalKey, number>;
  if (clickDataMissing && rawMap.gmv != null) {
    effectiveW = { gmv: 1.0, ctr: 0, ctor: 0 };
  } else {
    const present = (Object.keys(W) as SignalKey[]).filter((k) => normalizedMap[k] !== null);
    const missing  = (Object.keys(W) as SignalKey[]).filter((k) => normalizedMap[k] === null);
    const totalMissingW  = missing.reduce((s, k) => s + W[k], 0);
    const totalPresentW  = present.reduce((s, k) => s + W[k], 0);
    effectiveW = {} as Record<SignalKey, number>;
    for (const k of present) {
      const base = W[k];
      effectiveW[k] = base + (totalPresentW > 0 ? (base / totalPresentW) * totalMissingW : 0);
    }
    for (const k of missing) effectiveW[k] = 0;
  }

  const present = (Object.keys(W) as SignalKey[]).filter((k) => normalizedMap[k] !== null);
  const missing  = (Object.keys(W) as SignalKey[]).filter((k) => normalizedMap[k] === null);

  let total = 0;
  const signals: ConversionScore["signals"] = {
    gmv: null, ctr: null, ctor: null,
    // Legacy shims
    lsTier: null, gmvTrend: null, gmvPerLivestream: null, svEfficiency: null, livestreamFrequency: null,
  };

  const labels: Record<SignalKey, string> = {
    gmv:  "GMV (IDR)",
    ctr:  "Click-Through Rate",
    ctor: ctorMissing ? "CTOR (N/A)" : "Click-to-Order Rate",
  };

  for (const k of present) {
    const norm = normalizedMap[k]!;
    const w    = effectiveW[k];
    const contribution = w * norm;
    total += contribution;
    signals[k] = {
      rawValue: rawMap[k],
      normalizedScore: Math.round(norm * 10) / 10,
      weight: w,
      contribution,
      label: labels[k],
    } as SignalScore;
  }

  // Infer LS tier for backward compat
  let inferredLsTier: LSTier | undefined;
  if (!creator.lsTier) {
    const hasLive = (creator.livestreamsLast30d ?? 0) > 0;
    inferredLsTier = classifyLsTier(creator.gmv30d, hasLive || creator.gmv30d != null);
  }

  return {
    total: Math.round(Math.max(0, Math.min(100, total))),
    signals,
    ctorMissing,
    missingSignals: missing,
    dataCompleteness: present.length / Object.keys(W).length,
    inferredLsTier,
  };
}
