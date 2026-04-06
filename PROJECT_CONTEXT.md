# AMDB (Advanced Media Database) - Project Status

**Last Updated:** Phase 4 Completion (Sort, Filter, Recommendations Polish)

## 📌 Project Overview
AMDB is a premium, high-performance web application to track, rate, and discover Movies, TV Shows, and Anime. It uses a unified multi-API architecture stitching together TMDB, OMDB, and Jikan (MyAnimeList), presenting content in a dense glassmorphic UI with Claude-3 AI-powered recommendations.

## 🛠 Tech Stack
- **Framework:** Next.js 16 (App Router) — upgraded from 14 for security patches
- **Database:** PostgreSQL (Neon DB Serverless)
- **ORM:** Prisma v5
- **Auth:** NextAuth.js v4 (Google Provider)
- **Styling:** Tailwind CSS + custom glassmorphism
- **UI Components:** shadcn/ui + Radix Primitives + Vaul (Mobile Drawers)
- **Animations:** Framer Motion
- **External APIs:** Anthropic Claude-3 Haiku (Recommendations), TMDB API, Jikan API (Anime), OMDB API (Enrichment)

---

## ✅ Completed Features

### 1. Authentication & Identity
- Google OAuth via NextAuth.js, sessions persisted to Neon via Prisma adapter
- Multi-profile management (Netflix-style, max 5 per user)
- Profile CRUD: create with color picker, inline rename, delete with confirmation
- Optimistic deletion in the UI

### 2. Search & Data Ingestion
- Unified search across TMDB (Movies/TV) and Jikan (Anime) with debounce and pagination
- Content type filter on search (All / Movie / TV Show / Anime)
- On "Add to List": checks DB first before hitting external APIs
- OMDB enrichment auto-fetched for movies on add (cached in `ContentEnrichment`)
- Jikan enrichment cached similarly for anime

### 3. List Building & Tracking
- Add content with mandatory 1–10 rating (animated picker with color coding and labels)
- Optional notes field (500 char max)
- Movie-specific: date watched (calendar date picker popover)
- TV/Anime-specific: Watch Status (Watching / Plan to Watch / Completed / Dropped), Start date, End date, Episode count
- Edit existing entries (re-opens modal pre-filled)
- Optimistic delete from grid

### 4. List Sort & Filter (server-side, works across pagination)
- **Content type pills:** All / Movies / TV Shows / Anime — always visible
- **Sort dropdown:** Date Added, My Rating, TMDB Rating, Title, Year (each with asc/desc toggle)
- **Filter popover** (badge shows active filter count):
  - My Rating range (min/max selects, 1–10)
  - Watch Status multi-select (Watching, Plan to Watch, Completed, Dropped)
  - Genre multi-select (14 common genres, uses JSON string_contains on Postgres JSONB)
- Active filter chips shown below bar with individual remove buttons
- Result count shown when filters are active
- Filters reset to page 1 on change

### 5. High-Density Movie Card (Tier 1 + 2)
- **Tier 1 (always visible):** Title, poster, year, user rating badge (color-coded), TMDB rating, content type icon, 1-line note, age certification badge
- **Tier 2 (hover expansion):** Card expands in-flow (pushing grid neighbors), reveals backdrop image, tagline with left-bar accent, genre pills, full notes, watch status, type-specific metadata (revenue vs seasons/network), cross-source ratings (RT/IMDb/Metacritic via OMDB enrichment)
- Hover also reveals Remove button; click anywhere opens detail modal

### 6. Content Detail Modal
- Desktop: Radix Dialog; Mobile: Vaul Drawer
- Top cast carousel, embedded YouTube trailer, production info
- Budget vs revenue, popularity score, similar titles
- Where to watch / streaming providers

### 7. AI Recommendations
- Dedicated "Recommendations" tab with filter panel (content type + genre)
- Sends full watch history to Claude: high-rated titles as taste signal, lower-rated as avoidance signal, all watched titles as exclusion list
- Claude returns title + year + per-recommendation reason (why it fits your taste)
- Results enriched with posters/ratings from TMDB or Jikan
- Genre list switches between movie/TV genres and anime genres depending on selected type
- Reason shown on each recommendation card

---

## 🏗 Architecture & Agent Context Notes

### Database
- **`Content` table** is unified for Movie/TV/Anime — scalar metadata lives as columns for fast filtering/sorting; massive payloads (cast, videos) go in `ContentEnrichment` JSONB rows.
- **`ContentEnrichment`** uses `source` string (`'omdb'`, `'jikan'`, `'tmdb'`) — add any future source (JustWatch, Rotten Tomatoes) as new rows, zero schema changes needed.
- **`UserContent`** has conditional fields: `watchedDate` (movies), `watchStatus/startDate/endDate/episodeCount` (TV/anime). These are `null` for the non-applicable type.
- Genre filter uses Prisma `string_contains` on the JSONB `genres` column — reliable at current scale.

### Auth Quirk — DO NOT CHANGE
The default `signIn` callback was bypassed due to premature query execution against Postgres. Sub-profile initialization happens exclusively inside `events: { createUser: async({ user }) }` in `src/lib/auth.ts`. **Do NOT rewrite initial profile generation into the `callbacks` block.**

### API Design
- All list operations (GET, POST) on `/api/list` are server-side — sort/filter params are query strings, not client-side state.
- Content lookup on add: checks DB by `tmdbId` (or `malId` for anime) before hitting external APIs.
- OMDB is only called for movies with an `imdb_id`, never on search — only on add.

---

## 🎨 Information Tier System (for Cards / Modal / Page)

Agreed tier structure for what data to show at each UI level:

| Tier | Surface | Fields |
|------|---------|--------|
| **1** | All (collapsed card, expanded, modal, page) | Title, Poster, Year, Personal Rating, TMDB Rating, Content Type Icon, Notes (1-line truncated), Age Certification |
| **2** | Expanded card + modal + page | Watch Status, Full Notes, Runtime, Adult flag, Languages, Cross-source ratings (MAL/IMDB/RT), Box Office Revenue, Backdrop image, Tagline, Genres |
| **3** | Modal + page | Full Synopsis, Trailer embed, Top Cast carousel, Key Crew (Director/Writer/Producer), Budget vs Revenue, Production Companies, Popularity score, Similar Titles, Where to Watch |
| **4** | Dedicated page only | Full cast/crew directory, Extended media (multiple trailers, BTS), Global release dates, External deep links (IMDB, official site), Thematic keywords/tags, Watch history timeline |

---

## 🔗 URL Structure
- Individual content pages use format: `/[content-type]/[slug]-[id]`
- Examples: `/anime/one-piece-123456`, `/movie/inception-550`, `/tv/breaking-bad-1396`
- `content-type` is `movie`, `tv`, or `anime` (TV_SHOW → `tv`)
- Slug utility at `src/lib/slug.ts` — `buildContentUrl()` and `parseSlug()`
- Routes scaffolded at `src/app/movie/[slug]/`, `src/app/tv/[slug]/`, `src/app/anime/[slug]/`
- Similar Titles in modal now navigate to these real routes

---

### 8. Individual Detail Pages (Tier 4)
- Routes: `/movie/[slug]`, `/tv/[slug]`, `/anime/[slug]` — all fully live
- Slug format: `[title-slug]-[id]` e.g. `/anime/one-piece-21`, `/movie/inception-550`
- Fetcher library: `src/lib/content-detail.ts` — exported `fetchMovieDetail`, `fetchTvDetail`, `fetchAnimeDetail`
- Shared component: `src/components/content-detail-page.tsx` — single source of truth for Tier 4 layout
- Server-side fetch with `next: { revalidate: 3600 }` — pages are ISR cached
- Content includes: full cast grid, crew by department, all videos, financials+ROI, global release dates, where to watch (JustWatch via TMDB), external links (IMDb/Instagram/Twitter/Facebook), thematic keywords, similar titles
- Watch providers: checks India first (`IN`), falls back to `US`
- Ongoing shows: uses 1-week proximity check to show 'Ongoing' vs actual end year
- `generateMetadata` on each route for proper SEO + OpenGraph images

### 9. Age Certification Storage
- On content first-insert in `/api/list` POST: parses US cert from TMDB `release_dates` (movies) and `content_ratings` (TV)
- Stored in `Content.ageCertification` column; displayed on Tier 1 card badge

---

## 🔗 URL Structure
- Format: `/[content-type]/[slug]-[id]`
- `content-type` values: `movie`, `tv`, `anime` (TV_SHOW maps to `tv`)
- Utilities in `src/lib/slug.ts`: `buildContentUrl()`, `slugify()`, `parseSlug()`
- Similar Titles in modal navigate to real slug routes

---

## 🚧 Next Steps

1. **Git + Deployment** — repo not yet initialized; targeting GitHub + Vercel
2. **Jikan characters** — `fetchAnimeDetail` calls `raw.characters` but Jikan's `/anime/{id}` endpoint doesn't include characters by default; a separate `/anime/{id}/characters` call is needed if full cast is wanted on Anime pages
3. **Backfill existing items** — items already in the DB don't have `ageCertification`; a one-time migration or background job could backfill via TMDB
4. **Recommendation tuning** — current `temperature: 0.7` works well; anime edge cases may need prompt adjustment
