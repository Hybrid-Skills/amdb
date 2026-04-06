# AMDB (Advanced Media Database) - Project Status

**Last Updated:** Phase 5 Completion (UI/UX Refinement & Data Enrichment)

## 📌 Project Overview
AMDB is a premium, high-performance web application to track, rate, and discover Movies, TV Shows, and Anime. It uses a unified multi-API architecture stitching together TMDB, OMDB, and Jikan (MyAnimeList), presenting content in a dense glassmorphic UI with Claude-3 AI-powered recommendations.

## 🛠 Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL (Neon DB Serverless)
- **ORM:** Prisma v5
- **Auth:** NextAuth.js v4 (Google Provider)
- **Styling:** Tailwind CSS + custom glassmorphism
- **UI Components:** shadcn/ui + Radix Primitives + Vaul (Mobile Drawers)
- **Animations:** Framer Motion
- **External APIs:** Anthropic Claude-3 Haiku (Recommendations), TMDB API, Jikan API (Anime), OMDB API (Cross-Source Ratings)
- **Version Control:** Git (initialized with 'Stable state' commit)

---

## ✅ Completed Features

### 1. Authentication & Multi-Profiles
- Google OAuth via NextAuth.js
- Multi-profile management (max 5 per user) with color picker and inline rename (double-click)
- Profile deletion with confirmation

### 2. Information Architecture (Card & Detail)
- **MovieCard (Tier 1):** Simplified vertical grid (aspect 2/3). Scale-up hover effect (1.05x).
- **Overlays:** Hover reveals "Edit" (pencil) and "Delete" (X) icons.
- **Rating Badge:** High-contrast numeric badge (e.g., "8", "9") on dark backgrounds.
- **AddToListModal:** sticky CTA bar (conditionally visible in edit mode), "View full page" links, year in title, OMDB ratings integration.
- **ContentDetailPage (Tier 4):** Comprehensive metadata, OMDB ratings (RT, IMDb, Metacritic), cast carousel, trailers, and financial ROI.

### 3. Search & List Building
- Unified search (TMDB + Jikan)
- Add content with 1–10 rating, notes, and type-specific fields (Watched date vs Watch Status/Episodes)
- **OMDB Enrichment:** Auto-fetched for Movies and TV Shows on add (cached in `ContentEnrichment`).

### 4. Dashboard (List Management)
- Server-side sorting (Date Added, Rating, Title, Year) and filtering (Rating range, Status, Genre)
- Active filter chips and result counts
- Skeleton loaders matched to new card dimensions to prevent layout shifts
- Refresh button for quick list updates

### 5. AI Recommendations
- Claude-3 powered suggestions based on watch history (likes/dislikes)
- Content-type and genre-aware filtering
- Per-recommendation reasoning (linked to user taste)

---

## 🏗 Architecture & Agent Context Notes

### Database & Enrichment
- **Unified `Content` table** with scalar metadata for fast sorting/filtering.
- **`ContentEnrichment`** stores raw JSON payloads (OMDB, Jikan) to avoid schema bloat.
- **POST `/api/list`** now fetches OMDB data for both Movies and TV Shows (if `imdb_id` is available) on first insert.

### UI Interaction Logic
- **Edit Flow:** Triggered by clicking the card or the pencil icon; opens modal.
- **Delete Flow:** Triggered by clicking the X icon; shows a global confirmation dialog.
- **Modal CTAs:** "Update List" / "Cancel" buttons are hidden in the modal unless the user is actively editing a list entry (starts as true for new additions).

---

## 🎨 Information Tier System

| Tier | Surface | Fields |
|------|---------|--------|
| **1** | Collapsed card | Title, Poster, Year, Numeric Rating, Content Type Icon, 1-line note, Age Certification |
| **2** | Modal summary | Personal Rating, Notes, Runtime, Adult flag, Cross-source ratings (IMDB/RT/MC), Backdrop, Tagline |
| **3** | Modal body | Full Synopsis, Trailer embed, Top Cast carousel, Key Crew, Box Office, Streaming Providers |
| **4** | Dedicated page | Full cast/crew directory, Extended media, Global release dates, External links, Thematic keywords |

---

## 🔗 URL Structure
- Format: `/[content-type]/[slug]-[id]` (e.g., `/movie/inception-550`)
- Utilities in `src/lib/slug.ts`
- Pages are ISR cached (1-hour revalidation)

---

## 🚧 Roadmap & Known Issues
- **Jikan cast backfill:** Full cast on anime pages requires a separate Jikan endpoint call.
- **Legacy item enrichment:** Background job needed to fetch `ageCertification` and `omdbRatings` for items added before Phase 5.
- **Deployment:** Targeting Vercel for production scaling.
