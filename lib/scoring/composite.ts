/**
 * Composite scorer — Task 2
 *
 * Overall = 0.5 × Branding + 0.5 × Commerce
 *
 * Badge logic:
 *   Both present    → "Full Score"
 *   Branding only   → "Branding Only" — Overall = Branding
 *   Commerce only   → "Commerce Only" — Overall = Commerce
 *   Neither         → "No Data"
 */

import { Creator, ScoredCreator, BrandingScore, ConversionScore, CompositeScore, ScoreBadge } from "@/types/creator";
import { SCORING_CONFIG } from "@/constants/scoring-config";
import { computeBrandingScore } from "./branding";
import { computeConversionScore } from "./conversion";
import { generateRecommendationTags } from "./recommendations";

function hasBrandingData(b: BrandingScore): boolean {
  return b.dataCompleteness > 0;
}

function hasCommerceData(c: ConversionScore): boolean {
  return c.dataCompleteness > 0;
}

export function computeCompositeScore(
  branding: BrandingScore,
  commerce: ConversionScore,
  brandingWeight?: number,
  conversionWeight?: number,
): CompositeScore {
  const bw = brandingWeight ?? SCORING_CONFIG.composite.defaultBrandingWeight;
  const cw = conversionWeight ?? SCORING_CONFIG.composite.defaultConversionWeight;

  const brandingPresent = hasBrandingData(branding);
  const commercePresent = hasCommerceData(commerce);

  let badge: ScoreBadge;
  let total: number;

  if (brandingPresent && commercePresent) {
    badge = "Full Score";
    const total_w = bw + cw;
    const nb = total_w > 0 ? bw / total_w : 0.5;
    const nc = total_w > 0 ? cw / total_w : 0.5;
    total = branding.total * nb + commerce.total * nc;
  } else if (brandingPresent) {
    badge = "Branding Only";
    total = branding.total;
  } else if (commercePresent) {
    badge = "Commerce Only";
    total = commerce.total;
  } else {
    badge = "No Data";
    total = 0;
  }

  const totalW = bw + cw;
  const normBw = totalW > 0 ? bw / totalW : 0.5;
  const normCw = totalW > 0 ? cw / totalW : 0.5;

  return {
    total: Math.round(Math.max(0, Math.min(100, total))),
    brandingScore: branding.total,
    conversionScore: commerce.total,
    brandingWeight: normBw,
    conversionWeight: normCw,
    badge,
  };
}

export function scoreCreator(
  creator: Creator,
  brandingWeight?: number,
  conversionWeight?: number,
): ScoredCreator {
  const branding = computeBrandingScore(creator);
  const conversion = computeConversionScore(creator);
  const composite = computeCompositeScore(branding, conversion, brandingWeight, conversionWeight);
  const tags = generateRecommendationTags(creator, branding, conversion, composite);

  return { ...creator, branding, conversion, composite, tags };
}

export function scoreCreators(
  creators: Creator[],
  brandingWeight?: number,
  conversionWeight?: number,
): ScoredCreator[] {
  const scored = creators.map((c) => scoreCreator(c, brandingWeight, conversionWeight));
  scored.sort((a, b) => b.composite.total - a.composite.total);
  scored.forEach((c, i) => { c.rank = i + 1; });
  return scored;
}

export function reweightCreators(
  scored: ScoredCreator[],
  brandingWeight: number,
  conversionWeight: number,
): ScoredCreator[] {
  const reweighted = scored.map((c) => ({
    ...c,
    composite: computeCompositeScore(c.branding, c.conversion, brandingWeight, conversionWeight),
  }));
  reweighted.sort((a, b) => b.composite.total - a.composite.total);
  reweighted.forEach((c, i) => { c.rank = i + 1; });
  return reweighted;
}
