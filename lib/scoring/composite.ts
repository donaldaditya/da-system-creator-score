import { Creator, ScoredCreator, BrandingScore, ConversionScore, CompositeScore } from "@/types/creator";
import { SCORING_CONFIG } from "@/constants/scoring-config";
import { computeBrandingScore } from "./branding";
import { computeConversionScore } from "./conversion";
import { generateRecommendationTags } from "./recommendations";

/**
 * Compute composite score from branding and conversion scores.
 *
 * Composite = (brandingScore × brandingWeight) + (conversionScore × conversionWeight)
 * Weights must sum to 1.0 — enforced by normalization here.
 *
 * @param brandingTotal - branding score 0-100
 * @param conversionTotal - conversion score 0-100
 * @param brandingWeight - e.g. 0.5 (defaults to config value)
 * @param conversionWeight - e.g. 0.5 (defaults to config value)
 */
export function computeCompositeScore(
  brandingTotal: number,
  conversionTotal: number,
  brandingWeight?: number,
  conversionWeight?: number
): CompositeScore {
  const bw = brandingWeight ?? SCORING_CONFIG.composite.defaultBrandingWeight;
  const cw = conversionWeight ?? SCORING_CONFIG.composite.defaultConversionWeight;

  // Normalize weights to ensure they sum to 1
  const totalWeight = bw + cw;
  const normalizedBw = totalWeight > 0 ? bw / totalWeight : 0.5;
  const normalizedCw = totalWeight > 0 ? cw / totalWeight : 0.5;

  const total = brandingTotal * normalizedBw + conversionTotal * normalizedCw;

  return {
    total: Math.round(Math.max(0, Math.min(100, total))),
    brandingScore: brandingTotal,
    conversionScore: conversionTotal,
    brandingWeight: normalizedBw,
    conversionWeight: normalizedCw,
  };
}

/**
 * Run the full scoring pipeline for a single creator.
 * Computes branding, conversion, composite scores and recommendation tags.
 *
 * @param creator - raw creator input
 * @param brandingWeight - optional weight override (0-1)
 * @param conversionWeight - optional weight override (0-1)
 */
export function scoreCreator(
  creator: Creator,
  brandingWeight?: number,
  conversionWeight?: number
): ScoredCreator {
  const branding: BrandingScore = computeBrandingScore(creator);
  const conversion: ConversionScore = computeConversionScore(creator);
  const composite: CompositeScore = computeCompositeScore(
    branding.total,
    conversion.total,
    brandingWeight,
    conversionWeight
  );

  const tags = generateRecommendationTags(creator, branding, conversion, composite);

  return {
    ...creator,
    branding,
    conversion,
    composite,
    tags,
  };
}

/**
 * Score multiple creators and assign rank by composite score descending.
 */
export function scoreCreators(
  creators: Creator[],
  brandingWeight?: number,
  conversionWeight?: number
): ScoredCreator[] {
  const scored = creators.map((c) => scoreCreator(c, brandingWeight, conversionWeight));

  // Sort by composite total descending and assign rank
  scored.sort((a, b) => b.composite.total - a.composite.total);
  scored.forEach((c, i) => {
    c.rank = i + 1;
  });

  return scored;
}

/**
 * Re-rank already-scored creators with updated weights (client-side use).
 * Avoids re-running the full scoring pipeline — just recomputes composite.
 */
export function reweightCreators(
  scored: ScoredCreator[],
  brandingWeight: number,
  conversionWeight: number
): ScoredCreator[] {
  const reweighted = scored.map((c) => ({
    ...c,
    composite: computeCompositeScore(
      c.branding.total,
      c.conversion.total,
      brandingWeight,
      conversionWeight
    ),
  }));

  reweighted.sort((a, b) => b.composite.total - a.composite.total);
  reweighted.forEach((c, i) => {
    c.rank = i + 1;
  });

  return reweighted;
}
