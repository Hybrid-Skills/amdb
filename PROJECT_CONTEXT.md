# AMDB (Advanced Media Database) - Project Status

**Last Updated:** Phase 10 (Deferred Enrichment, UI Solidification & Data Persistence)

## 📌 Project Overview
AMDB is a premium, high-performance web application to track, rate, and discover Movies, TV Shows, and Anime. It uses a unified multi-API architecture stitching together TMDB, OMDB, and Jikan (MyAnimeList), presenting content in a dense glassmorphic UI with Gemini AI-powered recommendations.

## 🛠 Tech Stack
- **Framework:** Next.js 15.5 (App Router)
- **Database:** PostgreSQL (Neon DB Serverless)
- **ORM:** Prisma v5.22 (with `relationJoins` preview feature)
- **Auth:** NextAuth.js v4 (Google Provider) — **JWT session strategy** (no DB session lookup)
- **Styling:** Tailwind CSS + custom glassmorphism
- **UI Components:** shadcn/ui + Radix Primitives + Vaul (Mobile Drawers)
- **Animations:** Framer Motion
- **External APIs:** Google Gemini (Recommendations), TMDB API, Jikan API (Anime), OMDB API (Cross-Source Ratings)
- **Deployment:** Vercel Production

---

## ✅ Completed Features

### 1. Authentication & Multi-Profiles
- Google OAuth via NextAuth.js with **JWT session strategy** (eliminates DB session lookup on every request)
- Multi-profile management (max 5 per user) with color picker and inline rename (double-click)
- Profile deletion with confirmation

### 2. Information Architecture (Card & Detail)
- **MovieCard (Unified):** Standardized across Watched, Planned, and Recommended views.
  - **Aesthetic:** Solid-fill CTAs merged flush with the card body (primary-colored for actions, secondary for status).
  - **Descriptive Ratings:** Watched cards display both numeric scores and human-readable labels (e.g., `★ 10 Masterpiece`, `★ 8 Great`).
  - **Poster Area:** Optimized `next/image` integration with device-specific sizing.
- **AddToListModal (Tier 2 & 3):**
  - Opens instantly — `ensure()` runs fire-and-forget in background
  - Backdrop hero with priority loading; poster hidden on mobile
  - Review field (500 chars max), date picker with month/year drill-down
  - Watch providers piggybacked on content detail fetch (no extra round trip)
  - Rating picker doesn't reload when background `amdbId` resolves
- **ContentDetailPage (Tier 4):**
  - Poster hidden on mobile (`hidden md:block`), shown on desktop
  - Video carousel with dedicated prev/next nav buttons on desktop
  - Mobile swipe still works via snap scroll

### 3. Search & List Building
- Unified search (TMDB + Jikan)
- Add content with 1–10 rating, review (500 chars), and type-specific fields
- **OMDB Enrichment:** Auto-fetched for Movies and TV Shows on add (cached in `ContentEnrichment`)
- List **refreshes immediately** after adding a title (`cache: 'no-store'`)

### 4. Genre Filtering
- **`genreNames` denormalized field:** Pipe-delimited string e.g. `|Action|Adventure|Sci-Fi|`
- **Normalization:** TMDB combined genres (`Action & Adventure`) are split on ` & ` via `src/lib/genres.ts` so individual genre filters match correctly
- **OR logic:** Selecting multiple genres returns items matching any selected genre

### 5. Dashboard & Performance (Phase 7–10)
- **Resolved Vercel Timeouts (Deferred Enrichment):**
  - **Architecture:** AI recommendation API only returns raw titles (~4s). Metadata (posters/ratings) is fetched via parallel client-side enrichment requests.
  - **Status Feedback:** Multi-phase progress updates ("Fetching data" → "Getting recommendations" → "Getting details").
- **Sub-1s Load Times:**
  - JWT session: ~0ms vs ~400ms DB session lookup
  - Parallel queries: profiles + list + count in a single `Promise.all()`
  - `unstable_cache` on list fetch (30s revalidation) for repeat loads
  - `relationLoadStrategy: 'join'` on all list/detail queries
- **SSR initial data:** First render is pre-populated from server — no loading skeleton
- **Modal performance:** Watch providers included in content detail response; no separate TMDB call
- **Image optimization:**
  - 100% `<Image />` coverage via `TmdbImage` wrapper
  - `tmdbImageLoader` correctly handles raw TMDB paths (e.g. `logo_path`, `poster_path`)
  - Backdrops capped at `w1280` (~200KB); modal backdrop `sizes` capped at 1280px
  - Streaming provider icons load correctly (fixed path prefix handling in loader)
- **Branding:** WebP logo (22KB), PNG favicon (256px, 63KB), single favicon link tag

### 6. ID System
- **Base62 IDs:** `src/lib/id.ts` uses `0-9a-zA-Z` (62 chars) — 62^8 ≈ 218 trillion possibilities
- Previously base36 (36 chars, 2.8 trillion). Existing IDs unaffected; new content uses base62.

### 7. AI Recommendations & Personalization
- **Special Instructions:** Optional text field (200 chars) allows users to inject custom prompt constraints (e.g., "Movies under 2 hours").
- **Multi-model selector:** Dropdown in filter panel lets user pick AI model
  - Gemma 4 31B (default) — `gemma-4-31b-it`
  - Gemini 2.5 Flash — `gemini-2.5-flash`
  - Gemini 3 Flash (**PREMIUM** badge) — `gemini-3-flash-preview`
  - Gemini 3.1 Flash Lite — `gemini-3.1-flash-lite-preview`
- Server validates model against whitelist — falls back to `gemma-4-31b-it`
- `responseMimeType: 'application/json'` enforces structured output natively
- Content-type and genre-aware; per-recommendation reasoning text saved to dedicated `recommendationReason` field.

---

## 🏗 Architecture & Agent Context Notes

### Session & Auth
- **JWT strategy** in `src/lib/auth.ts`: `jwt()` callback stores `user.id` in token; `session()` callback reads from token. No DB hit on authenticated requests.
- **PrismaAdapter** still used for account/user creation during OAuth (requires transaction support — HTTP Neon driver incompatible, use standard PrismaClient).

### Database & Enrichment
- **Unified `Content` table** — Primary Key is custom 8-char base62 ID (`src/lib/id.ts`)
- **Dedicated Data Persistence:** AI recommendation context is stored in `recommendationReason`, separating it from user-provided `notes`.
- **TMDB-ID Caching:** Recommendations API checks for existing `Content` by `tmdbId` before calling external search, prioritizing internal cache performance.
- **Relation Joins:** `relationLoadStrategy: 'join'` on all list/modal queries
- **Composite Indexes:** `(profileId, addedAt)`, `(profileId, userRating)`, `(profileId, watchStatus)`
- **`genreNames`:** Pipe-wrapped string built by `src/lib/genres.ts → buildGenreNames()`. Splits TMDB combined genres on ` & `. B-tree indexed for `contains` queries.
- **`ContentEnrichment`:** JSONB rows per source (`omdb`, `jikan`). OMDB ratings only loaded in modal (not on SSR list query).
- **Caching:** `/api/content/[tmdbId]` has `s-maxage=3600, stale-while-revalidate=86400`. `/api/list` uses `cache: 'no-store'` client-side to always show fresh data post-add.

### Image Loading
- `tmdbImageLoader` in `src/lib/tmdb.ts`: size bucket resolved first, then handles full URLs, raw `/path` style, and external URLs correctly.
- `TmdbImage` client component wraps `<Image loader={tmdbImageLoader}>` for use from server components.

### Modal Data Flow
1. `handleSearchSelect` → opens modal immediately, fires `ensure` in background
2. `fetchedForRef` tracks which `tmdbId/malId` was fetched — prevents re-fetch when only `amdbId` updates
3. Content detail fetch includes `watch/providers` via `append_to_response` — no second provider fetch needed
4. `onSuccess` → `fetchList(..., cache: 'no-store')` → list updates immediately

### UI Patterns
- **Responsive poster:** `hidden md:block` on detail page hero and modal
- **Video carousel:** `snap-x` scroll + desktop prev/next buttons driven by `scrollRef` + `ResizeObserver`
- **Date picker:** Click month/year header → month grid view with year chevrons; `minYear` prop caps earliest selectable year to content release year
- **Model dropdown:** Custom component (not native `<select>`) to render inline Premium badge

---

## 🎨 Information Tier System

| Tier | Surface | Fields |
|------|---------|--------|
| **1** | Collapsed card | Title, Optimized Poster, Year, Numeric Rating, Content Type Icon, 1-line review, Age Certification |
| **2** | Modal summary | Personal Rating, Review (500 chars), Runtime, Adult flag, Cross-source ratings (IMDB/RT/MC), Backdrop, Tagline |
| **3** | Modal body | Full Synopsis, Trailer embed, Top Cast carousel, Key Crew, Box Office, Streaming Providers |
| **4** | Dedicated page | Full cast/crew directory, Extended media (video carousel), Global release dates, External links |

---

## 🔗 URL Structure
- Format: `/[content-type]/[slug]-[id]` (e.g., `/movie/inception-w474a27s`)
- Primary ID: Custom 8-character base62 alphanumeric string (case-sensitive)
- Detail pages: `revalidate = 0` (always fresh)

---

## 🚧 Roadmap & Known Issues
- **Jikan cast backfill:** Full cast on anime pages requires a separate Jikan endpoint call
- **Legacy item enrichment:** Background job needed for `ageCertification` and `omdbRatings` for items added before Phase 5
- **Search Latency:** Search remains un-indexed; consider edge-caching common queries
- **GEMINI_API_KEY:** Must be set in Vercel environment variables for recommendations to work
