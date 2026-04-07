# AMDB (Advanced Media Database) - Project Status

**Last Updated:** Phase 8 Completion (Deep Asset & Filter Optimization)

## 📌 Project Overview
AMDB is a premium, high-performance web application to track, rate, and discover Movies, TV Shows, and Anime. It uses a unified multi-API architecture stitching together TMDB, OMDB, and Jikan (MyAnimeList), presenting content in a dense glassmorphic UI with Claude-3 AI-powered recommendations.

## 🛠 Tech Stack
- **Framework:** Next.js 15.1 (App Router)
- **Database:** PostgreSQL (Neon DB Serverless)
- **ORM:** Prisma v5.22 (with `relationJoins` preview feature)
- **Auth:** NextAuth.js v4 (Google Provider)
- **Styling:** Tailwind CSS + custom glassmorphism
- **UI Components:** shadcn/ui + Radix Primitives + Vaul (Mobile Drawers)
- **Animations:** Framer Motion
- **External APIs:** Anthropic Claude-3 Haiku (Recommendations), TMDB API, Jikan API (Anime), OMDB API (Cross-Source Ratings)
- **Deployment:** Vercel Production

---

## ✅ Completed Features

### 1. Authentication & Multi-Profiles
- Google OAuth via NextAuth.js
- Multi-profile management (max 5 per user) with color picker and inline rename (double-click)
- Profile deletion with confirmation

### 2. Information Architecture (Card & Detail)
- **MovieCard (Tier 1):** Dense vertical grid (aspect 2/3).
  - **Poster Area:** Optimized `next/image` integration with device-specific sizing.
  - **Info Area:** Inline Year with Title, Full-width solid Watch button CTA, fast notes preview on hover.
- **AddToListModal:** sticky CTA bar (conditionally visible in edit mode), "View full page" links.
- **ContentDetailPage (Tier 4):** 
  - **Mobile-first Hierarchy:** Re-ordered sections to favor dense metadata first.
  - **Unified Videos:** Unified horizontal carousel for Trailers and clips, launching an immersive in-page Modal Player.
  - **Premium Ratings:** Custom CSS-styled brand pseudo-icons for IMDb (yellow), Rotten Tomatoes (🍅), and Metacritic (green).

### 3. Search & List Building
- Unified search (TMDB + Jikan)
- Add content with 1–10 rating, notes, and type-specific fields (Watched date vs Watch Status/Episodes)
- **OMDB Enrichment:** Auto-fetched for Movies and TV Shows on add (cached in `ContentEnrichment`).

### 4. Dashboard & Performance (Phase 7 & 8)
- **Sub-1s Load Times:** Achieved through aggressive database indexing and Prisma `relationJoins`.
- **Genre Denormalization:** Implemented `genreNames` indexed field for high-speed string searching (replacing slow JSON scanning).
- **Flexible Filtering:** Switched multi-genre filtering to `OR` logic (matches any selected) for better discovery.
- **Atomic Queries:** Omit default filters (1–10 rating, "All" types) from database queries on initial load to maximize performance.
- **100% Next.js Image Coverage:** Successfully replaced every `<img>` tag with optimized `<Image />` components using a custom `TmdbImage` boundary-safe client wrapper.
- **Advanced Asset Capping:** Backdrops capped at `w1280` (~200KB) and branding assets (favicon/logo) optimized (~430KB -> <10KB).
- **Mobile UX Stability:** Explicit viewport locking (`maximumScale: 1`) and 16px minimum font sizes on mobile to prevent browser auto-zoom.

### 5. AI Recommendations
- Claude-3 powered suggestions based on watch history (likes/dislikes)
- Content-type and genre-aware filtering
- Per-recommendation reasoning (linked to user taste)

---

## 🏗 Architecture & Agent Context Notes

### Database & Enrichment
- **Unified `Content` table** with scalar metadata for fast sorting/filtering. Primary Key is a custom 8-character alphanumeric ID (`src/lib/id.ts`).
- **Relation Joins:** Uses `relationLoadStrategy: 'join'` for the list API to minimize network round-trips.
- **Composite Indexes:** Optimized for `(profileId, addedAt)`, `(profileId, userRating)`, and `(profileId, watchStatus)`.
- **Denormalized Filtering:** `genreNames` field allows `contains` queries on a B-tree index for instant list filtering.
- **Caching Strategy:** `/api/list` and `/api/content/[tmdbId]` implement `stale-while-revalidate` headers for near-instant client side filtering and modal opens.

### UI Interaction Logic
- **Responsive Images:** Uses `<Image />` with `tmdbImageLoader`. Sizes are tailored for a 6-column desktop grid vs 2-column mobile grid.
- **Mobile Zoom Fix:** All inputs, selects, and textareas use `text-base` (16px) on mobile via global CSS override to prevent iOS Safari auto-zoom.

---

## 🎨 Information Tier System

| Tier | Surface | Fields |
|------|---------|--------|
| **1** | Collapsed card | Title, Optimized Poster, Year, Numeric Rating, Content Type Icon, 1-line note, Age Certification |
| **2** | Modal summary | Personal Rating, Notes, Runtime, Adult flag, Cross-source ratings (IMDB/RT/MC), Backdrop, Tagline |
| **3** | Modal body | Full Synopsis, Trailer embed, Top Cast carousel, Key Crew, Box Office, Streaming Providers |
| **4** | Dedicated page | Full cast/crew directory, Extended media, Global release dates, External links, Thematic keywords |

---

## 🔗 URL Structure
- Format: `/[content-type]/[slug]-[id]` (e.g., `/movie/inception-w474a27s`)
- Primary ID: Custom 8-character alphanumeric lowercase string.
- ISR cached (1-hour revalidation) on specific entry points.

---

## 🚧 Roadmap & Known Issues
- **Jikan cast backfill:** Full cast on anime pages requires a separate Jikan endpoint call.
- **Legacy item enrichment:** Background job needed to fetch `ageCertification` and `omdbRatings` for items added before Phase 5.
- **Search Latency:** Search remains un-indexed; consider edge-caching common search queries.
