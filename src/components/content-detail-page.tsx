import * as React from 'react';
import Link from 'next/link';
import type { ContentDetail } from '@/lib/content-detail';
import { buildContentUrl } from '@/lib/slug';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(val: number | null) {
  if (!val) return 'N/A';
  if (val >= 1_000_000_000) return '$' + (val / 1_000_000_000).toFixed(1) + 'B';
  if (val >= 1_000_000) return '$' + (val / 1_000_000).toFixed(1) + 'M';
  return '$' + val.toLocaleString();
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function RatingBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-xl border ${color} bg-white/5 min-w-[64px]`}>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</span>
      <span className="text-lg font-black leading-tight">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
      <span className="w-1 h-5 rounded-full bg-primary inline-block" />
      {children}
    </h2>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface ContentDetailPageProps {
  data: ContentDetail;
}

export function ContentDetailPage({ data }: ContentDetailPageProps) {
  const isSerial = data.contentType === 'TV_SHOW' || data.contentType === 'ANIME';
  const trailer = data.videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
  const otherVideos = data.videos.filter((v) => v !== trailer).slice(0, 5);

  // Aired text
  let airedText = '';
  if (data.firstAirDate) {
    const first = new Date(data.firstAirDate).getFullYear();
    const lastText = data.lastAirDate ? new Date(data.lastAirDate).getFullYear().toString() : 'Ongoing';
    airedText = `${first} – ${lastText}`;
  }

  // Group full crew by department
  const crewByDept = data.fullCrew.reduce<Record<string, typeof data.fullCrew>>((acc, c) => {
    const dept = c.department || 'Other';
    acc[dept] = acc[dept] ?? [];
    acc[dept].push(c);
    return acc;
  }, {});
  const deptOrder = ['Directing', 'Writing', 'Production', 'Camera', 'Sound', 'Art', 'Costume & Make-Up', 'Editing', 'Visual Effects', 'Other'];

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── Hero ── */}
      <div className="relative w-full h-[55vh] md:h-[65vh]">
        {data.backdropUrl ? (
          <img src={data.backdropUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />

        {/* Back nav */}
        <Link href="/" className="absolute top-4 left-4 z-20 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/10 transition-colors">
          ← Back
        </Link>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex gap-6 items-end z-10">
          {data.posterUrl && (
            <img src={data.posterUrl} alt={data.title} className="hidden md:block w-40 rounded-2xl shadow-2xl border border-white/10 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex flex-wrap gap-2 mb-3">
              {data.ageCertification && (
                <span className="px-2 py-0.5 text-xs font-bold border border-red-500 text-red-400 rounded-md">{data.ageCertification}</span>
              )}
              {data.contentType === 'MOVIE' && <span className="px-2 py-0.5 text-xs font-semibold border border-white/20 text-white/60 rounded-md">Movie</span>}
              {data.contentType === 'TV_SHOW' && <span className="px-2 py-0.5 text-xs font-semibold border border-blue-500/50 text-blue-400 rounded-md">TV Show</span>}
              {data.contentType === 'ANIME' && <span className="px-2 py-0.5 text-xs font-semibold border border-purple-500/50 text-purple-400 rounded-md">Anime</span>}
              {data.status && <span className="px-2 py-0.5 text-xs font-semibold border border-green-500/30 text-green-400 rounded-md">{data.status}</span>}
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight drop-shadow-2xl">
              {data.title}
            </h1>
            {data.originalTitle && data.originalTitle !== data.title && (
              <p className="text-white/50 text-sm mt-1 italic">{data.originalTitle}</p>
            )}
            {data.tagline && (
              <p className="text-white/60 text-sm md:text-base mt-2 font-light italic">"{data.tagline}"</p>
            )}

            {/* Quick stats */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-white/60">
              {data.year && <span>{data.year}</span>}
              {airedText && <span>Aired: {airedText}</span>}
              {data.runtimeMins && <span>{data.runtimeMins}m</span>}
              {data.episodeRuntime && <span>{data.episodeRuntime}m/ep</span>}
              {data.numberOfSeasons && <span>{data.numberOfSeasons} Seasons</span>}
              {data.numberOfEpisodes && <span>{data.numberOfEpisodes} Episodes</span>}
              {data.genres.slice(0, 3).map((g) => (
                <span key={g.id} className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-xs">{g.name}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 flex flex-col gap-14">

        {/* Ratings row */}
        <div className="flex flex-wrap gap-3">
          {data.tmdbRating && data.tmdbRating > 0 && (
            <RatingBadge label="TMDB" value={`${data.tmdbRating}`} color="border-yellow-500/30 text-yellow-400" />
          )}
          {data.tmdbVoteCount && (
            <div className="flex flex-col items-center px-3 py-2 rounded-xl border border-white/10 bg-white/5 min-w-[64px]">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Votes</span>
              <span className="text-lg font-black leading-tight">{(data.tmdbVoteCount / 1000).toFixed(0)}K</span>
            </div>
          )}
          {data.popularity && (
            <div className="flex flex-col items-center px-3 py-2 rounded-xl border border-white/10 bg-white/5 min-w-[64px]">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Popularity</span>
              <span className="text-lg font-black leading-tight">{data.popularity.toFixed(0)}</span>
            </div>
          )}
        </div>

        {/* Overview */}
        {data.overview && (
          <section>
            <SectionTitle>Overview</SectionTitle>
            <p className="text-white/80 leading-relaxed text-base font-light max-w-3xl">{data.overview}</p>
          </section>
        )}

        {/* Trailer */}
        {trailer && (
          <section>
            <SectionTitle>Trailer</SectionTitle>
            <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}?modestbranding=1&rel=0`}
                className="w-full h-full"
                allowFullScreen
                title={trailer.name}
              />
            </div>
          </section>
        )}

        {/* Other Videos */}
        {otherVideos.length > 0 && (
          <section>
            <SectionTitle>More Videos</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {otherVideos.map((v) => (
                <a key={v.key} href={`https://www.youtube.com/watch?v=${v.key}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors group">
                  <img src={`https://img.youtube.com/vi/${v.key}/mqdefault.jpg`} alt={v.name} className="w-24 h-14 object-cover rounded-lg shrink-0" />
                  <div>
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-2">{v.name}</p>
                    <p className="text-xs text-white/40 mt-0.5">{v.type}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Key Crew */}
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

        {/* Full Cast */}
        {data.cast.length > 0 && (
          <section>
            <SectionTitle>Full Cast</SectionTitle>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {data.cast.map((actor) => (
                <div key={actor.id} className="flex flex-col">
                  {actor.profile_path ? (
                    <img src={actor.profile_path} alt={actor.name} className="w-full aspect-[2/3] object-cover rounded-xl border border-white/10 mb-1.5" />
                  ) : (
                    <div className="w-full aspect-[2/3] rounded-xl bg-white/5 border border-white/10 mb-1.5 flex items-center justify-center text-white/20 text-xs text-center px-1">{actor.name}</div>
                  )}
                  <p className="text-xs font-semibold leading-tight line-clamp-1">{actor.name}</p>
                  <p className="text-[10px] text-white/40 line-clamp-1 leading-tight mt-0.5">{actor.character}</p>
                </div>
              ))}
            </div>
          </section>
        )}

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
              {data.budget && data.revenue && data.budget > 0 && data.revenue > 0 && (
                <div className="flex flex-col p-4 rounded-xl border border-white/10 bg-white/5 min-w-[140px]">
                  <span className="text-xs text-white/40 uppercase font-bold tracking-wider mb-1">ROI</span>
                  <span className={`text-2xl font-black ${data.revenue >= data.budget ? 'text-green-400' : 'text-red-400'}`}>
                    {((data.revenue / data.budget) * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Where to Watch */}
        {data.watchProviders && (
          <section>
            <SectionTitle>Where To Watch</SectionTitle>
            <div className="flex flex-col gap-4">
              {data.watchProviders.flatrate && data.watchProviders.flatrate.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-2">Streaming</p>
                  <div className="flex flex-wrap gap-3">
                    {data.watchProviders.flatrate.map((p) => (
                      <div key={p.provider_id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5">
                        <img src={p.logo_path} alt={p.provider_name} className="w-8 h-8 rounded-lg" />
                        <span className="text-sm font-medium">{p.provider_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.watchProviders.rent && data.watchProviders.rent.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-2">Rent</p>
                  <div className="flex flex-wrap gap-3">
                    {data.watchProviders.rent.map((p) => (
                      <div key={p.provider_id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5">
                        <img src={p.logo_path} alt={p.provider_name} className="w-8 h-8 rounded-lg" />
                        <span className="text-sm font-medium">{p.provider_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Production */}
        {(data.productionCompanies.length > 0 || data.spokenLanguages.length > 0 || data.networks.length > 0) && (
          <section>
            <SectionTitle>Production</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {data.productionCompanies.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-2">Studios</p>
                  <div className="flex flex-col gap-1">
                    {data.productionCompanies.map((c) => <p key={c.id} className="text-sm">{c.name}</p>)}
                  </div>
                </div>
              )}
              {data.spokenLanguages.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-2">Languages</p>
                  <div className="flex flex-col gap-1">
                    {data.spokenLanguages.map((l) => <p key={l.iso_639_1} className="text-sm">{l.english_name}</p>)}
                  </div>
                </div>
              )}
              {data.networks.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-2">Networks</p>
                  <div className="flex flex-col gap-1">
                    {data.networks.map((n) => <p key={n.id} className="text-sm">{n.name}</p>)}
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

        {/* Keywords */}
        {data.keywords.length > 0 && (
          <section>
            <SectionTitle>Themes & Keywords</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {data.keywords.map((kw) => (
                <span key={kw} className="px-2.5 py-1 text-[11px] rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white/80 transition-colors">{kw}</span>
              ))}
            </div>
          </section>
        )}

        {/* Release Dates (movies) */}
        {data.releaseDates.length > 0 && (
          <section>
            <SectionTitle>Global Release Dates</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {data.releaseDates
                .filter((rd) => rd.type === 'Theatrical' || rd.type === 'Premiere')
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 24)
                .map((rd, i) => (
                  <div key={i} className="p-2.5 rounded-lg border border-white/10 bg-white/3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white/60">{rd.country}</span>
                      {rd.certification && <span className="text-[10px] font-bold text-red-400 border border-red-500/30 px-1 rounded">{rd.certification}</span>}
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">{formatDate(rd.date)}</p>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Full Crew by Department */}
        {data.fullCrew.length > 0 && (
          <section>
            <SectionTitle>Full Crew</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {deptOrder.filter((d) => crewByDept[d]?.length).map((dept) => (
                <div key={dept}>
                  <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-3">{dept}</p>
                  <div className="flex flex-col gap-1.5">
                    {crewByDept[dept].map((c, i) => (
                      <div key={`${c.id}-${i}`} className="flex items-center justify-between">
                        <span className="text-sm">{c.name}</span>
                        <span className="text-xs text-white/40">{c.job}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Similar */}
        {data.similar.length > 0 && (
          <section>
            <SectionTitle>Similar Titles</SectionTitle>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {data.similar.map((s) => {
                const href = buildContentUrl(data.contentType, s.title, s.id);
                return (
                  <Link key={s.id} href={href} className="group flex flex-col">
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 relative mb-1.5">
                      {s.poster_path ? (
                        <img src={s.poster_path} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-center text-xs text-white/30 p-2">{s.title}</div>
                      )}
                    </div>
                    <p className="text-xs font-semibold line-clamp-2 leading-tight group-hover:text-primary transition-colors">{s.title}</p>
                    {s.vote_average > 0 && <p className="text-[10px] text-yellow-400 mt-0.5">★ {s.vote_average.toFixed(1)}</p>}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
