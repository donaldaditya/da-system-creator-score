"use client";

import { create } from "zustand";
import {
  Creator,
  ScoredCreator,
  Platform,
  Category,
  LSTier,
  RecommendationTag,
  CampaignObjective,
  CreatorFilters,
  SortConfig,
  ViewMode,
} from "@/types/creator";
import { reweightCreators } from "@/lib/scoring/composite";

// ─── State Shape ──────────────────────────────────────────────────────────────

export type Currency = "IDR" | "USD";

interface CreatorStore {
  // Raw and scored data
  creators: Creator[];
  scoredCreators: ScoredCreator[];

  // Currency preference
  currency: Currency;

  // Scoring weights (0-1, sum = 1)
  brandingWeight: number;
  conversionWeight: number;

  // Campaign context
  campaignObjective: CampaignObjective;
  targetCategories: Category[];

  // Filters
  filters: CreatorFilters;

  // Sort
  sortBy: SortConfig;

  // UI state
  viewMode: ViewMode;
  selectedForComparison: string[]; // creator ids
  selectedCreatorId: string | null; // for detail panel

  // Loading state
  isScoring: boolean;
  scoringError: string | null;

  // ─── Actions ──────────────────────────────────────────────────────────────

  setCreators: (creators: Creator[]) => void;
  setScoredCreators: (scored: ScoredCreator[]) => void;

  setWeights: (brandingWeight: number, conversionWeight: number) => void;
  setCampaignObjective: (objective: CampaignObjective) => void;
  setTargetCategories: (categories: Category[]) => void;

  setFilters: (filters: Partial<CreatorFilters>) => void;
  resetFilters: () => void;

  setSortBy: (sort: SortConfig) => void;
  setViewMode: (mode: ViewMode) => void;

  toggleComparison: (creatorId: string) => void;
  clearComparison: () => void;
  setSelectedCreator: (id: string | null) => void;

  setCurrency: (c: Currency) => void;

  setIsScoring: (loading: boolean) => void;
  setScoringError: (error: string | null) => void;

  // Derived: get filtered + sorted creators
  getFilteredCreators: () => ScoredCreator[];

  // Reset all state
  reset: () => void;
}

// ─── Default Filter State ─────────────────────────────────────────────────────

const DEFAULT_FILTERS: CreatorFilters = {
  platforms: [],
  categories: [],
  lsTiers: [],
  scoreRange: [0, 100],
  tags: [],
  searchQuery: "",
};

const DEFAULT_SORT: SortConfig = {
  field: "composite",
  direction: "desc",
};

// ─── Store ────────────────────────────────────────────────────────────────────

// Persist scoredCreators to sessionStorage so navigation doesn't lose results
const SESSION_KEY = "roi_scored_creators";
function loadFromSession(): ScoredCreator[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ScoredCreator[]) : [];
  } catch { return []; }
}
function saveToSession(creators: ScoredCreator[]) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(creators)); } catch { /* quota */ }
}

export const useCreatorStore = create<CreatorStore>()((set, get) => ({
  creators: [],
  scoredCreators: loadFromSession(),
  currency: "IDR",
  brandingWeight: 0.5,
  conversionWeight: 0.5,
  campaignObjective: CampaignObjective.Both,
  targetCategories: [],
  filters: { ...DEFAULT_FILTERS },
  sortBy: { ...DEFAULT_SORT },
  viewMode: "table",
  selectedForComparison: [],
  selectedCreatorId: null,
  isScoring: false,
  scoringError: null,

  setCreators: (creators) => set({ creators }),

  setScoredCreators: (scored) => { saveToSession(scored); set({ scoredCreators: scored }); },

  setWeights: (brandingWeight, conversionWeight) => {
    const { scoredCreators } = get();
    // Normalize weights
    const total = brandingWeight + conversionWeight;
    const bw = total > 0 ? brandingWeight / total : 0.5;
    const cw = total > 0 ? conversionWeight / total : 0.5;

    // Re-rank client-side without API call
    const reweighted = reweightCreators(scoredCreators, bw, cw);

    set({
      brandingWeight: bw,
      conversionWeight: cw,
      scoredCreators: reweighted,
    });
  },

  setCampaignObjective: (objective) => {
    // Auto-set weights based on objective
    const weightMap: Record<CampaignObjective, [number, number]> = {
      [CampaignObjective.Branding]: [0.8, 0.2],
      [CampaignObjective.Conversion]: [0.2, 0.8],
      [CampaignObjective.Both]: [0.5, 0.5],
    };
    const [bw, cw] = weightMap[objective];
    set({ campaignObjective: objective, brandingWeight: bw, conversionWeight: cw });
  },

  setTargetCategories: (categories) => set({ targetCategories: categories }),

  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial },
    })),

  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  setSortBy: (sortBy) => set({ sortBy }),

  setViewMode: (viewMode) => set({ viewMode }),

  toggleComparison: (creatorId) => {
    const { selectedForComparison } = get();
    if (selectedForComparison.includes(creatorId)) {
      set({
        selectedForComparison: selectedForComparison.filter((id) => id !== creatorId),
      });
    } else if (selectedForComparison.length < 4) {
      set({ selectedForComparison: [...selectedForComparison, creatorId] });
    }
  },

  clearComparison: () => set({ selectedForComparison: [] }),

  setSelectedCreator: (id) => set({ selectedCreatorId: id }),

  setCurrency: (currency) => set({ currency }),

  setIsScoring: (isScoring) => set({ isScoring }),

  setScoringError: (error) => set({ scoringError: error }),

  getFilteredCreators: () => {
    const { scoredCreators, filters, sortBy } = get();

    let result = [...scoredCreators];

    // Filter by platform
    if (filters.platforms.length > 0) {
      result = result.filter((c) => filters.platforms.includes(c.platform));
    }

    // Filter by category
    if (filters.categories.length > 0) {
      result = result.filter((c) => c.category && filters.categories.includes(c.category));
    }

    // Filter by LS tier
    if (filters.lsTiers.length > 0) {
      result = result.filter((c) => {
        const tier = c.lsTier || c.conversion.inferredLsTier;
        return tier && filters.lsTiers.includes(tier);
      });
    }

    // Filter by score range
    const [minScore, maxScore] = filters.scoreRange;
    result = result.filter(
      (c) => c.composite.total >= minScore && c.composite.total <= maxScore
    );

    // Filter by tags
    if (filters.tags.length > 0) {
      result = result.filter((c) =>
        filters.tags.some((tag) => c.tags.includes(tag))
      );
    }

    // Filter by search query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.handle.toLowerCase().includes(q) ||
          (c.category && c.category.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortBy.field) {
        case "composite":
          aVal = a.composite.total;
          bVal = b.composite.total;
          break;
        case "branding":
          aVal = a.branding.total;
          bVal = b.branding.total;
          break;
        case "conversion":
          aVal = a.conversion.total;
          bVal = b.conversion.total;
          break;
        case "followers":
          aVal = a.followers ?? 0;
          bVal = b.followers ?? 0;
          break;
        case "engagementRate":
          aVal = a.engagementRate ?? 0;
          bVal = b.engagementRate ?? 0;
          break;
        case "gmv30d":
          aVal = a.gmv30d ?? 0;
          bVal = b.gmv30d ?? 0;
          break;
        default:
          aVal = a.composite.total;
          bVal = b.composite.total;
      }

      return sortBy.direction === "desc" ? bVal - aVal : aVal - bVal;
    });

    return result;
  },

  reset: () =>
    set({
      creators: [],
      scoredCreators: [],
      brandingWeight: 0.5,
      conversionWeight: 0.5,
      campaignObjective: CampaignObjective.Both,
      targetCategories: [],
      filters: { ...DEFAULT_FILTERS },
      sortBy: { ...DEFAULT_SORT },
      viewMode: "table",
      selectedForComparison: [],
      selectedCreatorId: null,
      isScoring: false,
      scoringError: null,
    }),
}));

// ─── Selector Helpers ─────────────────────────────────────────────────────────

export const selectFilteredCreators = (state: CreatorStore) =>
  state.getFilteredCreators();

export const selectComparisonCreators = (state: CreatorStore) =>
  state.scoredCreators.filter((c) => state.selectedForComparison.includes(c.id));

export const selectSelectedCreator = (state: CreatorStore) =>
  state.scoredCreators.find((c) => c.id === state.selectedCreatorId) ?? null;
