import * as React from 'react';
import { Suspense } from 'react';
import type { ContentDetail } from '@/lib/content-detail';
import { DetailHero } from './content-detail/hero';
import { RatingsRow } from './content-detail/ratings-row';
import { CastSection } from './content-detail/cast-section';
import { VideosSection } from './content-detail/videos-section';
import { CrewSection } from './content-detail/crew-section';
import { SimilarSection } from './content-detail/similar-section';
import { ReleaseDatesSection } from './content-detail/release-dates-section';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(val: number | null) {
  if (!val) return 'N/A';
  if (val >= 1_000_000_000) return '$' + (val / 1_000_000_000).toFixed(1) + 'B';
  if (val >= 1_000_000) return '$' + (val / 1_000_000).toFixed(1) + 'M';
  return '$' + val.toLocaleString();
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold tracking-tight mb-3 md:mb-4 flex items-center gap-2">
      <span className="w-1 h-5 rounded-full bg-primary inline-block" />
      {children}
    </h2>
  );
}

function SkeletonSection({ height = 'h-40' }: { height?: string }) {
  return <div className={`w-full ${height} rounded-2xl bg-white/5 animate-pulse`} />;
}

// ─── Main Component (Server Component) ───────────────────────────────────────

interface ContentDetailPageProps {
  data: ContentDetail;
}

export function ContentDetailPage({ data }: ContentDetailPageProps) {
  const tmdbId = data.tmdbId;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Hero Fold (Fast Zone) ── */}
      <DetailHero data={data} />

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-2 pb-8 md:py-10 flex flex-col gap-4 md:gap-14">
        {/* Ratings row */}
        <RatingsRow data={data} />

        {/* Overview */}
        {data.overview && (
          <section>
            <SectionTitle>Overview</SectionTitle>
            <p className="text-white/80 leading-relaxed text-base font-light max-w-3xl">
              {data.overview}
            </p>
          </section>
        )}

        {/* Videos Section */}
        <VideosSection videos={data.videos} />

        {/* Key Crew info that was in basic TMDB fetch */}
        {(data.crew.director || data.crew.writer || data.crew.producer || data.crew.cinematographer || data.crew.composer) && (
          <section>
            <SectionTitle>Behind the Camera</SectionTitle>
            <div className="flex flex-wrap gap-6">
              {[
                { role: 'Director', name: data.crew.director },
                { role: 'Writer', name: data.crew.writer },
                { role: 'Producer', name: data.crew.producer },
                { role: 'Cinematography', name: data.crew.cinematographer },
                { role: 'Music', name: data.crew.composer },
              ].filter((c) => c.name).map((c) => (
                <div key={c.role}>
                  <p className="text-white font-bold">{c.name}</p>
                  <p className="text-xs text-white/40 mt-0.5">{c.role}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Heavy Zones (Async/Streamed) ── */}
        
        {tmdbId && (
          <>
            <Suspense fallback={<SkeletonSection height="h-60" />}>
              <CastSection tmdbId={tmdbId} contentType={data.contentType} />
            </Suspense>

            <Suspense fallback={<SkeletonSection height="h-40" />}>
              <CrewSection tmdbId={tmdbId} contentType={data.contentType} />
            </Suspense>

            <Suspense fallback={<SkeletonSection height="h-64" />}>
              <SimilarSection tmdbId={tmdbId} contentType={data.contentType} />
            </Suspense>
          </>
        )}

        {/* ── Static/Pre-fetched Details ── */}

        {/* Financials (movies only) */}
        {data.contentType === 'MOVIE' && (data.budget || data.revenue) && (
          <section>
            <SectionTitle>Box Office</SectionTitle>
            <div className="flex gap-6 flex-wrap">
              {data.budget && data.budget > 0 && (
                <div className="flex flex-col p-4 rounded-xl border border-white/10 bg-white/5 min-w-[140px]">
                  <span className="text-xs text-white/40 uppercase font-bold tracking-wider mb-1">Budget</span>
                  <span className="text-2xl font-black">{formatCurrency(data.budget)}</span>
                </div>
              )}
              {data.revenue && data.revenue > 0 && (
                <div className="flex flex-col p-4 rounded-xl border border-green-500/20 bg-green-500/5 min-w-[140px]">
                  <span className="text-xs text-green-400/60 uppercase font-bold tracking-wider mb-1">Revenue</span>
                  <span className="text-2xl font-black text-green-400">{formatCurrency(data.revenue)}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Production Companies & Networks */}
        {(data.productionCompanies.length > 0 || data.spokenLanguages.length > 0 || (data.networks && data.networks.length > 0)) && (
          <section>
            <SectionTitle>Production</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {data.productionCompanies.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-2">Studios</p>
                  <div className="flex flex-col gap-1">
                    {data.productionCompanies.map((c) => <p key={c.id} className="text-sm text-white/80">{c.name}</p>)}
                  </div>
                </div>
              )}
              {data.spokenLanguages.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-2">Languages</p>
                  <div className="flex flex-col gap-1">
                    {data.spokenLanguages.map((l) => <p key={l.iso_639_1} className="text-sm text-white/80">{l.english_name}</p>)}
                  </div>
                </div>
              )}
              {data.networks && data.networks.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-2">Networks</p>
                  <div className="flex flex-col gap-1">
                    {data.networks.map((n) => <p key={n.id} className="text-sm text-white/80">{n.name}</p>)}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* External Links */}
        {(data.externalIds.imdb_id || data.externalIds.instagram_id || data.externalIds.twitter_id || data.externalIds.facebook_id) && (
          <section>
            <SectionTitle>External Links</SectionTitle>
            <div className="flex flex-wrap gap-3">
              {data.externalIds.imdb_id && (
                <a href={`https://www.imdb.com/title/${data.externalIds.imdb_id}`} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl border border-yellow-500/30 text-yellow-400 text-sm font-bold hover:bg-yellow-500/10 transition-colors">
                  IMDb ↗
                </a>
              )}
              {data.externalIds.instagram_id && (
                <a href={`https://www.instagram.com/${data.externalIds.instagram_id}`} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl border border-pink-500/30 text-pink-400 text-sm font-bold hover:bg-pink-500/10 transition-colors">
                  Instagram ↗
                </a>
              )}
              {data.externalIds.twitter_id && (
                <a href={`https://www.twitter.com/${data.externalIds.twitter_id}`} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl border border-sky-500/30 text-sky-400 text-sm font-bold hover:bg-sky-500/10 transition-colors">
                  Twitter ↗
                </a>
              )}
              {data.externalIds.facebook_id && (
                <a href={`https://www.facebook.com/${data.externalIds.facebook_id}`} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl border border-blue-500/30 text-blue-400 text-sm font-bold hover:bg-blue-500/10 transition-colors">
                  Facebook ↗
                </a>
              )}
            </div>
          </section>
        )}

        {/* Release Dates */}
        <ReleaseDatesSection dates={data.releaseDates} />

        {/* Keywords */}
        {data.keywords.length > 0 && (
          <section>
            <SectionTitle>Themes & Keywords</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {data.keywords.map((kw) => (
                <span key={kw} className="px-2.5 py-1 text-[11px] rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white/80 transition-colors font-medium">{kw}</span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
