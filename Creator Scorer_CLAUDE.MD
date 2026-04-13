# Creator ROI Scorer — Claude Code Build Spec

## Project Overview

A web application for **brands, agencies, and MCN operators** to evaluate, score, and shortlist social media creators across two objective tracks: **Branding** and **Conversion/Sales**. The tool accepts data from multiple sources, applies a proprietary scoring model, and outputs actionable recommendations.

Target users:
- Brand internal marketing teams (non-technical)
- Agency affiliate managers and analysts
- Internal MCN/TSP operations teams

This is also a portfolio-quality public demo — it must look and feel polished and impressive.

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API routes (serverless)
- **Data parsing**: `papaparse` (CSV), `xlsx` (Excel)
- **Scraping**: `puppeteer` or `playwright` (for URL input mode)
- **Charts/Viz**: `recharts`
- **Export**: `xlsx` for Excel export, `jspdf` + `html2canvas` for PDF
- **State**: Zustand
- **Styling**: Tailwind + shadcn/ui components
- **Deployment-ready**: Vercel (default)

---

## Data Input — 4 Modes

Build a tabbed input interface with these 4 modes:

### Mode 1: CSV / Excel Upload
- Accept `.csv`, `.xlsx`, `.xls`
- Auto-detect column headers (fuzzy match to expected fields)
- Show preview table before scoring
- Required columns vary by objective track (see Scoring Model section)
- Provide a **downloadable template** for both Branding and Conversion track

### Mode 2: URL Paste (Scraper)
- User pastes one or multiple creator profile URLs (TikTok, Instagram, YouTube)
- App attempts public data extraction via scraper
- Scraped fields: username, follower count, following, bio, recent post count, avg engagement
- Show scrape status per URL (success / partial / failed)
- Graceful fallback: if scrape fails, show manual fill form for that creator
- **Important**: TikTok aggressively blocks scrapers. Use rotating user-agents, delays between requests, and browser-like headers. Consider using a headless browser approach. Show user a clear warning that scrape success is not guaranteed.

### Mode 3: TikTok TSP / MCN API
- Connect via TikTok Shop Partner API or MCN dashboard API
- OAuth flow: user provides their TSP/MCN API credentials (stored in session only, never persisted)
- Fetch creator roster with available data fields
- Map API response fields to internal scoring schema
- Show sync status and last-updated timestamp
- Document which API endpoints are used (for user reference)

### Mode 4: Manual Entry
- Form-based entry for a single creator
- All fields optional except creator name/handle
- Useful for one-off evaluations or adding creators not in a database

---

## Data Schema

### Core Creator Fields (all modes)
```
creator_id          string    unique identifier
handle              string    @username
platform            enum      tiktok | instagram | youtube | shopee
full_name           string    optional
category            string[]  beauty | lifestyle | fashion | FMCG | electronics | home_living | food | gaming | finance | other
country             string    ID | SG | MY | TH | PH | other
```

### Branding Fields
```
followers           number
following           number
avg_views_per_post  number
total_posts_30d     number
total_likes_30d     number
total_comments_30d  number
total_shares_30d    number
posting_frequency   number    posts per week
content_consistency string    high | medium | low  (or auto-calculated)
profile_bio         string    optional, used for niche detection
```

### Conversion / Sales Fields
```
gmv_30d             number    USD
gmv_60d             number    USD
gmv_90d             number    USD
sv_count_30d        number    short videos posted
sv_count_60d        number
sv_count_90d        number
ls_count_30d        number    livestream sessions
ls_count_60d        number
ls_count_90d        number
gmv_per_ls          number    average GMV per livestream session
ls_tier             enum      LS0–LS8 (auto-calculated if GMV data available)
```

---

## Scoring Model

### LS Tier Classification (Auto-calculated from gmv_30d)
```
LS0   never gone live (ls_count_30d = 0, no historical live data)
LS1   has gone live, GMV = 0
LS2   has gone live, GMV > 0 but < $1K
LS3   $1K – $3K
LS4   $3K – $15K
LS5   $15K – $50K
LS6   $50K – $100K
LS7   $100K – $1M
LS8   > $1M
```
Display LS tier as a badge on every creator card. Color-code: LS0–LS2 grey, LS3–LS4 yellow, LS5–LS6 blue, LS7–LS8 gold.

---

### Branding Score (0–100)

| Signal | Weight | Calculation |
|---|---|---|
| Engagement Rate | 35% | (likes + comments + shares) / followers × 100 |
| View-to-Follower Ratio | 25% | avg_views / followers |
| Content Consistency | 20% | posting frequency normalized + niche focus score |
| Follower Base | 10% | log-normalized follower count (penalizes micro + mega equally at extremes) |
| Niche Alignment | 10% | user-set target category match |

Normalize each signal to 0–100 before weighting. Final score = weighted sum.

Benchmark thresholds for display:
- Engagement Rate: < 1% = weak, 1–3% = average, 3–6% = strong, > 6% = exceptional
- View-to-Follower: < 10% = weak, 10–30% = average, > 30% = strong

---

### Conversion Score (0–100)

| Signal | Weight | Calculation |
|---|---|---|
| LS Tier | 30% | LS0=0, LS1=5, LS2=10, LS3=30, LS4=50, LS5=70, LS6=82, LS7=92, LS8=100 |
| GMV Trend | 25% | (gmv_30d / gmv_90d × 3) — 1.0 = flat, > 1.0 = growing, < 1.0 = declining |
| GMV per Livestream | 20% | gmv_per_ls normalized against cohort |
| SV-to-GMV Efficiency | 15% | gmv_30d / sv_count_30d (revenue per short video) |
| Livestream Frequency | 10% | ls_count_30d normalized (target = 8–12 sessions/month as benchmark) |

---

### Composite Score (0–100)

```
composite = (branding_score × branding_weight) + (conversion_score × conversion_weight)
```

Default weights: 50% / 50%

**User-adjustable via slider** in the UI:
- Branding-heavy: 80/20
- Balanced: 50/50
- Conversion-heavy: 20/80

Changing the slider re-ranks the list in real time without re-fetching.

---

## Recommendation Engine

Two types of recommendations per creator:

### 1. Input-based (objective-driven)
When the user sets their campaign objective (branding vs. conversion), the app surfaces:
- Top 3 matches with explanation: *"Strong fit for branding campaign — 4.2% engagement rate, consistent posting 5x/week in beauty category"*
- Flags: *"Caution: GMV trend declining over 90 days"* or *"Rising creator — 60% GMV growth month-over-month"*

### 2. Logic-based (system intelligence)
Always-on signals that trigger recommendation tags regardless of user objective:

| Tag | Trigger Condition |
|---|---|
| 🔥 Rising Star | GMV trend > 1.3 AND LS tier ≤ LS4 |
| ⚡ High Converter | conversion_score > 75 |
| 🎯 Brand Safe | engagement_rate > 3% AND posting_frequency > 3x/week AND niche_focus = high |
| ⚠️ Declining | GMV trend < 0.7 over 90 days |
| 💎 Premium | LS tier ≥ LS7 OR followers > 1M |
| 🌱 Emerging | followers < 50K AND engagement_rate > 5% |
| 📦 Niche Expert | category match score = 100% AND content_consistency = high |

These tags appear as chips on creator cards and are filterable.

---

## UI / UX Requirements

### Design Direction
**Dark, data-dense, intelligence-forward.** Think Bloomberg Terminal meets modern SaaS. Not playful — this is a tool for professionals making commercial decisions. Use:
- Dark background (#0A0A0F or similar near-black)
- Sharp accent color: electric cyan or amber (pick one, commit to it)
- Monospace or semi-monospace font for data fields
- Clean sans-serif for UI chrome
- Subtle grid/table lines, not card-heavy
- Micro-animations on score reveals (count-up effect)
- No gradients on buttons — flat, high-contrast

### Page Structure

#### 1. Landing / Input Page
- Header: "Creator ROI Scorer" + tagline: *"Score. Rank. Decide."*
- 4 input mode tabs
- Campaign objective selector (Branding / Conversion / Both)
- Target category multi-select
- Weight adjustment slider (only shows when objective = "Both")
- CTA: "Score Creators"

#### 2. Results Dashboard
- Summary bar: total creators scored, avg composite score, top performer
- Filter panel (left): by platform, category, LS tier, score range, tags
- Sort options: composite score, branding score, conversion score, followers, GMV
- Creator list (main): table view + toggle to card view
  - Each row: handle, platform, category, LS tier badge, branding score, conversion score, composite score, recommendation tags
  - Click to expand: full score breakdown with signal-level detail
- Comparison mode: select 2–4 creators for side-by-side view
- Export button: Excel or PDF

#### 3. Creator Detail Panel (slide-in or modal)
- Full profile summary
- Score breakdown with bar charts per signal
- GMV trend chart (30/60/90 days)
- Recommendation summary with reasoning
- LS tier history if available

#### 4. Settings Panel
- Scoring weight configuration (persist in localStorage)
- Benchmark customization (advanced users)
- API credential management (TSP/MCN — session only)

---

## Export Formats

### Excel Export
- Sheet 1: Full scored list with all fields
- Sheet 2: Score breakdown per creator
- Sheet 3: Summary stats and top 10
- Includes LS tier, all tags, recommendation text

### PDF Export
- One-page summary per creator (optional: top 5 or top 10)
- Branded header (user can add their logo)
- Score visualization (bar charts rendered via canvas)
- Suitable for client presentation

---

## File Structure

```
/
├── app/
│   ├── page.tsx                  # Landing + input
│   ├── results/page.tsx          # Results dashboard
│   ├── api/
│   │   ├── score/route.ts        # Scoring engine
│   │   ├── scrape/route.ts       # URL scraper
│   │   ├── tiktok/route.ts       # TikTok API integration
│   │   └── export/route.ts       # Export handler
├── components/
│   ├── InputTabs/
│   ├── CreatorTable/
│   ├── CreatorCard/
│   ├── ScoreBreakdown/
│   ├── ComparisonPanel/
│   ├── FilterPanel/
│   ├── WeightSlider/
│   └── RecommendationBadge/
├── lib/
│   ├── scoring/
│   │   ├── branding.ts
│   │   ├── conversion.ts
│   │   ├── composite.ts
│   │   ├── ls-tier.ts
│   │   └── recommendations.ts
│   ├── parsers/
│   │   ├── csv.ts
│   │   ├── excel.ts
│   │   └── schema-mapper.ts
│   ├── scraper/
│   │   └── profile-scraper.ts
│   └── tiktok-api/
│       └── client.ts
├── types/
│   └── creator.ts
├── constants/
│   └── scoring-config.ts         # All weights, thresholds — editable here
└── public/
    └── templates/
        ├── branding-template.csv
        └── conversion-template.csv
```

---

## Scoring Config File (constants/scoring-config.ts)

All weights and thresholds must be defined in a single config file so they can be adjusted without touching scoring logic. Example structure:

```typescript
export const SCORING_CONFIG = {
  branding: {
    weights: {
      engagementRate: 0.35,
      viewToFollower: 0.25,
      contentConsistency: 0.20,
      followerBase: 0.10,
      nicheAlignment: 0.10,
    },
    benchmarks: {
      engagementRate: { weak: 1, average: 3, strong: 6 },
      viewToFollower: { weak: 0.10, average: 0.30 },
    }
  },
  conversion: {
    weights: {
      lsTier: 0.30,
      gmvTrend: 0.25,
      gmvPerLivestream: 0.20,
      svEfficiency: 0.15,
      livestreamFrequency: 0.10,
    },
    lsTierScores: {
      LS0: 0, LS1: 5, LS2: 10, LS3: 30, LS4: 50,
      LS5: 70, LS6: 82, LS7: 92, LS8: 100
    },
    benchmarks: {
      livestreamFrequencyTarget: 10, // sessions per month
      gmvTrendNeutral: 1.0,
    }
  },
  composite: {
    defaultBrandingWeight: 0.5,
    defaultConversionWeight: 0.5,
  }
}
```

---

## Error Handling & Edge Cases

- Missing fields: score only available signals, show "Incomplete data" warning, display score with asterisk
- All fields missing for a score track: show "Insufficient data for [Branding/Conversion] score"
- Scrape failure: show per-URL status, offer manual fill fallback
- Zero GMV + has livestreams: classify as LS1 not LS0
- Single data point (only 30d, no 60/90d): disable GMV trend signal, redistribute weight to remaining signals
- Large uploads (500+ creators): show progress bar, process in batches of 50

---

## Environment Variables Required

```
TIKTOK_APP_ID=
TIKTOK_APP_SECRET=
SCRAPER_PROXY_URL=           # optional, for rotating proxies
NEXT_PUBLIC_APP_VERSION=
```

---

## MVP Scope (Build in this order)

1. CSV/Excel upload + scoring engine (branding + conversion + composite)
2. Results table with filter, sort, LS tier badges, recommendation tags
3. Score breakdown detail panel
4. Comparison view
5. Excel export
6. Manual entry mode
7. URL scraper (best-effort)
8. TikTok TSP/MCN API integration
9. PDF export
10. Logo upload for PDF branding

---

## Notes for Claude Code

- All scoring weights live in `constants/scoring-config.ts` — do not hardcode numbers in logic files
- The LS tier system is proprietary to this tool — treat it as a first-class signal, not an afterthought
- The scraper must handle TikTok's anti-bot measures gracefully — never crash the app on scrape failure
- The weight slider must update rankings in real-time (client-side, no API call needed)
- Design must look impressive enough to post publicly — avoid default shadcn styling, customize the theme
- Comments in code should explain the "why" behind scoring decisions, not just the "what"
