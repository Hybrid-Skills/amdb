import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { tmdb, tmdbImageUrl } from '@/lib/tmdb';
import { searchJikan } from '@/lib/jikan';
import { generateShortId } from '@/lib/id';
import type { ContentType } from '@prisma/client';

export const maxDuration = 45;

const ALLOWED_MODELS = new Set([
  'gemma-4-31b-it',
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
]);

type AllowedModel = 'gemma-4-31b-it' | 'gemini-2.5-flash' | 'gemini-3-flash-preview' | 'gemini-3.1-flash-lite-preview';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Gemini API key is missing' }, { status: 500 });
  }

  const { profileId, contentType, genres, model: requestedModel } = await req.json();
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 });

  // Verify profile belongs to session user
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId: session.user.id },
  });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Validate model against whitelist — fall back to default if invalid/missing
  const model: AllowedModel = ALLOWED_MODELS.has(requestedModel)
    ? (requestedModel as AllowedModel)
    : 'gemma-4-31b-it';

  try {
    // Fetch all watched content for this profile
    const allItems = await prisma.userContent.findMany({
      where: {
        profileId,
        content: {
          contentType:
            contentType === 'ANY'
              ? undefined
              : contentType === 'TV_SHOW'
                ? { in: ['TV_SHOW' as const, 'ANIME' as const] }
                : (contentType as ContentType),
        },
      },
      include: {
        content: { select: { title: true, year: true, contentType: true, genres: true } },
      },
      orderBy: { userRating: 'desc' },
    });

    const highRated = allItems
      .filter((i) => i.userRating >= 7)
      .slice(0, 20)
      .map((i) => `"${i.content.title}" (${i.content.year ?? '?'}) — ${i.userRating}/10`);

    const lowerRated = allItems
      .filter((i) => i.userRating < 7)
      .slice(0, 10)
      .map((i) => `"${i.content.title}" (${i.content.year ?? '?'}) — ${i.userRating}/10`);

    // Also fetch planned and previously recommended titles to exclude from prompt
    const [plannedItems, pastRecs] = await Promise.all([
      prisma.userWatchlist.findMany({
        where: { profileId },
        include: { content: { select: { title: true } } },
      }),
      prisma.userRecommendation.findMany({
        where: { profileId },
        include: { content: { select: { title: true } } },
        take: 100,
      }),
    ]);

    const allExcludedTitles = [
      ...allItems.map((i) => `"${i.content.title}"`),
      ...plannedItems.map((i) => `"${i.content.title}"`),
      ...pastRecs.map((i) => `"${i.content.title}"`),
    ].join(', ');

    const typeLabel =
      contentType === 'TV_SHOW'
        ? 'TV show or anime'
        : contentType === 'MOVIE'
          ? 'movie'
          : 'movie, TV show or anime';

    const genreClause =
      genres && genres.length > 0 ? `The user prefers these genres: ${genres.join(', ')}.` : '';

    const historyClause =
      highRated.length > 0
        ? `The user highly rated these titles: ${highRated.join('; ')}.`
        : 'The user has no rated titles yet — suggest broadly popular critically acclaimed titles.';

    const avoidClause =
      lowerRated.length > 0
        ? `The user rated these lower (avoid similar): ${lowerRated.join('; ')}.`
        : '';

    const exclusionClause =
      allExcludedTitles.length > 0
        ? `IMPORTANT: Do NOT suggest any of these titles (already watched, planned, or previously recommended): ${allExcludedTitles}.`
        : '';

    const prompt = `You are an expert ${typeLabel} recommendation engine.

${historyClause}
${avoidClause}
${genreClause}
${exclusionClause}

Suggest exactly 6 ${typeLabel} titles the user has NOT seen. For each, provide:
- "title": exact title as known internationally
- "year": release year as a number
- "reason": one sentence (max 20 words) explaining why this fits the user's taste

Return ONLY a valid JSON array. No markdown, no explanation outside the JSON. Example:
[{"title":"Parasite","year":2019,"reason":"Dark social thriller with the same tension and twist you loved in similar films."}]

Give me the 6 recommendations as JSON.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const genModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600,
        responseMimeType: 'application/json', // forces valid JSON output — no parsing needed
      },
    });

    const result = await genModel.generateContent(prompt);
    const contentText = result.response.text().trim();

    // responseMimeType ensures valid JSON but strip any accidental markdown fences just in case
    const startIdx = contentText.indexOf('[');
    const endIdx = contentText.lastIndexOf(']');

    if (startIdx === -1 || endIdx === -1) {
      throw new Error('Failed to parse recommendations from Gemini response');
    }

    const recs = JSON.parse(contentText.substring(startIdx, endIdx + 1)) as {
      title: string;
      year: number;
      reason: string;
    }[];

    // Enrich with poster/rating data from TMDB or Jikan
    const enriched = await Promise.all(
      recs.map(async (rec) => {
        try {
          if (contentType === 'ANIME') {
            const res = await searchJikan(rec.title);
            const top = res.results[0];
            return top ? { ...top, reason: rec.reason } : null;
          } else {
            const search =
              contentType === 'TV_SHOW'
                ? await tmdb.searchTv(rec.title)
                : await tmdb.searchMovies(rec.title);
            const data = search.results[0];
            if (!data) return null;
            return {
              tmdbId: data.id,
              title: data.title ?? data.name ?? rec.title,
              year: data.release_date
                ? new Date(data.release_date).getFullYear()
                : data.first_air_date
                  ? new Date(data.first_air_date).getFullYear()
                  : rec.year,
              posterUrl: tmdbImageUrl(data.poster_path),
              tmdbRating: data.vote_average,
              overview: data.overview,
              contentType:
                contentType === 'ANY'
                  ? data.media_type === 'tv'
                    ? 'TV_SHOW'
                    : 'MOVIE'
                  : contentType,
              reason: rec.reason,
            };
          }
        } catch {
          return null;
        }
      }),
    );

    interface EnrichedRec {
      tmdbId?: number;
      malId?: number;
      title: string;
      year: number | null;
      posterUrl: string | null;
      tmdbRating: number | null;
      overview: string | null;
      contentType: string;
      reason?: string;
    }
    const finalRecs = enriched.filter(Boolean) as EnrichedRec[];
    const response = NextResponse.json({ recommendations: finalRecs });

    // Fire-and-forget: save recommendations to history without blocking the response
    void (async () => {
      try {
        const userId = session.user.id;

        // Look up existing Content records by tmdbId / malId in one batch query
        const tmdbIds = finalRecs.filter((r) => r.tmdbId).map((r) => r.tmdbId!);
        const malIds  = finalRecs.filter((r) => r.malId).map((r) => r.malId!);

        const existing = await prisma.content.findMany({
          where: {
            OR: [
              ...(tmdbIds.length ? [{ tmdbId: { in: tmdbIds } }] : []),
              ...(malIds.length  ? [{ malId:  { in: malIds  } }] : []),
            ],
          },
          select: { id: true, tmdbId: true, malId: true },
        });

        const byTmdb = new Map(existing.filter((c) => c.tmdbId).map((c) => [c.tmdbId!, c.id]));
        const byMal  = new Map(existing.filter((c) => c.malId).map((c) => [c.malId!, c.id]));

        // For recs whose Content doesn't exist yet, create lightweight records
        // using enriched data already in hand — no extra API calls needed
        const contentIds = await Promise.all(
          finalRecs.map(async (rec) => {
            const existingId = rec.tmdbId
              ? byTmdb.get(rec.tmdbId)
              : rec.malId
                ? byMal.get(rec.malId)
                : undefined;
            if (existingId) return existingId;

            try {
              const created = await prisma.content.create({
                data: {
                  id:          generateShortId(),
                  contentType: rec.contentType as ContentType,
                  title:       rec.title,
                  year:        rec.year ?? null,
                  posterUrl:   rec.posterUrl ?? null,
                  tmdbId:      rec.tmdbId ?? null,
                  malId:       rec.malId  ?? null,
                  tmdbRating:  rec.tmdbRating != null ? Number(rec.tmdbRating) : null,
                  overview:    rec.overview ?? null,
                },
              });
              return created.id;
            } catch {
              // Content may have been created concurrently — try to find it
              const fallback = await prisma.content.findFirst({
                where: rec.tmdbId
                  ? { tmdbId: rec.tmdbId }
                  : { malId: rec.malId ?? undefined },
                select: { id: true },
              });
              return fallback?.id ?? null;
            }
          }),
        );

        const validPairs = finalRecs
          .map((rec, i) => ({ rec, contentId: contentIds[i] }))
          .filter((p): p is { rec: NonNullable<(typeof finalRecs)[number]>; contentId: string } =>
            p.contentId != null,
          );

        if (validPairs.length > 0) {
          await prisma.userRecommendation.createMany({
            data: validPairs.map(({ rec, contentId }) => ({
              userId,
              profileId,
              contentType: String(rec.contentType),
              contentId,
            })),
            skipDuplicates: true,
          });
        }
      } catch (e) {
        console.error('[rec-history] save failed:', e);
      }
    })();

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate recommendations';
    console.error('Recommendation error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
