import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { tmdb, tmdbImageUrl } from '@/lib/tmdb';
import { searchJikan } from '@/lib/jikan';
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

    const allWatchedTitles = allItems.map((i) => `"${i.content.title}"`).join(', ');

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
      allWatchedTitles.length > 0
        ? `IMPORTANT: Do NOT suggest any of these already-watched titles: ${allWatchedTitles}.`
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

    return NextResponse.json({ recommendations: enriched.filter(Boolean) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate recommendations';
    console.error('Recommendation error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
