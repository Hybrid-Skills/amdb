import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { tmdb, tmdbImageUrl } from '@/lib/tmdb';
import { searchJikan } from '@/lib/jikan';
import { generateShortId } from '@/lib/id';
import type { ContentType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

export const maxDuration = 60;

const ALLOWED_MODELS = new Set([
  'gemma-4-31b-it',
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
]);

type AllowedModel =
  | 'gemma-4-31b-it'
  | 'gemini-2.5-flash'
  | 'gemini-3-flash-preview'
  | 'gemini-3.1-flash-lite-preview';

const recommendationSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING },
      year: { type: SchemaType.NUMBER },
      reason: { type: SchemaType.STRING },
    },
    required: ['title', 'year', 'reason'],
  },
} as const;

function extractJson(text: string) {
  let cleaned = text.replace(/```json\s?([\s\S]*?)```/g, '$1').trim();
  if (cleaned.includes('```')) cleaned = cleaned.replace(/```([\s\S]*?)```/g, '$1').trim();

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  let jsonCandidate = arrayMatch ? arrayMatch[0] : (objectMatch ? objectMatch[0] : cleaned);

  jsonCandidate = jsonCandidate.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  jsonCandidate = jsonCandidate.replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}');

  return jsonCandidate.trim();
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { profileId, contentType, genres, model: requestedModel, specialInstructions } = await req.json();
  if (!profileId || !process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Missing credentials or profileId' }, { status: 400 });
  }

  // Optimized: Parallelize profile check and AI model init
  const profilePromise = prisma.profile.findFirst({
    where: { id: profileId, userId: session.user.id },
  });

  const model: AllowedModel = ALLOWED_MODELS.has(requestedModel)
    ? (requestedModel as AllowedModel)
    : 'gemma-4-31b-it';

  const profile = await profilePromise;
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  let contentText = '';
  try {
    // 1. Fetch personalization data + Exclusion list in ONE parallel query
    const allProfileItems = await prisma.userContent.findMany({
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
      take: 200, // Safety limit for exclusion list to prevent prompt overflow
    });

    const watchedItems = allProfileItems.filter((i) => i.listStatus === 'WATCHED');
    const highRated = watchedItems.filter((i) => (i.userRating ?? 0) >= 7).slice(0, 15);
    const lowerRated = watchedItems.filter((i) => i.userRating != null && i.userRating < 7).slice(0, 5);

    const exclusionList = allProfileItems.map((i) => i.content.title).join(', ');
    const typeLabel = contentType === 'TV_SHOW' ? 'TV show or anime' : contentType === 'MOVIE' ? 'movie' : 'content';

    const prompt = `You are a movie recommendation engine.
Highly rated: ${highRated.map((i) => i.content.title).join(', ')}.
Avoid: ${lowerRated.map((i) => i.content.title).join(', ')}.
Genres: ${genres?.join(', ') || 'Any'}.
Already seen/excluded: ${exclusionList}.
${specialInstructions ? `Special Instructions: ${specialInstructions}` : ''}
Suggest exactly 6 ${typeLabel} titles the user has NOT seen. Return JSON array of objects with "title", "year" (number), and "reason" (string).`;

    // 2. Start AI generation
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const isGemini = model.startsWith('gemini');
    const genModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature: isGemini ? 0.7 : 0.8,
        maxOutputTokens: 800,
        responseMimeType: isGemini ? 'application/json' : undefined,
        responseSchema: isGemini ? (recommendationSchema as any) : undefined,
      },
    });

    const result = await genModel.generateContent(prompt);
    const resultResponse = await result.response;
    contentText = resultResponse.text().trim();

    // 3. Robust JSON extraction
    const cleanedJson = extractJson(contentText);
    const recs: { title: string; year: number; reason: string }[] = JSON.parse(cleanedJson);
    const finalRecsList = Array.isArray(recs) ? recs : (recs as any).recommendations || [];

    // 4. Optimized Parallel Enrichment (Limit anime to avoid Jikan rate limits)
    let animeCount = 0;
    const enriched = await Promise.all(
      finalRecsList.map(async (rec: any) => {
        try {
          if (contentType === 'ANIME' || (contentType === 'ANY' && animeCount < 2)) {
            // Check Jikan for Anime
            const res = await searchJikan(rec.title);
            if (res.results[0]) {
              if (contentType !== 'ANIME') animeCount++;
              return { ...res.results[0], reason: rec.reason };
            }
          }
          // Default to TMDB (Multi-search is safer for ANY)
          const search = await tmdb.searchMulti(rec.title);
          const data = search.results[0];
          if (!data) return null;
          return {
            tmdbId: data.id,
            title: data.title ?? data.name ?? rec.title,
            year: data.release_date ? new Date(data.release_date).getFullYear() : (data.first_air_date ? new Date(data.first_air_date).getFullYear() : rec.year),
            posterUrl: tmdbImageUrl(data.poster_path),
            tmdbRating: data.vote_average,
            overview: data.overview,
            contentType: data.media_type === 'tv' ? 'TV_SHOW' : 'MOVIE',
            reason: rec.reason,
          };
        } catch { return null; }
      })
    );

    const finalRecs = enriched.filter(Boolean) as any[];

    // 5. Optimized DB Save (WAITED - for better stability but fast batching)
    if (finalRecs.length > 0) {
      try {
        const tmdbIds = finalRecs.filter((r) => r.tmdbId).map((r) => r.tmdbId!);
        const existing = await prisma.content.findMany({
          where: { tmdbId: { in: tmdbIds } },
          select: { id: true, tmdbId: true }
        });
        const byTmdb = new Map(existing.map((c) => [c.tmdbId!, c.id]));

        const contentIds = await Promise.all(finalRecs.map(async (rec) => {
          if (rec.tmdbId && byTmdb.get(rec.tmdbId)) return byTmdb.get(rec.tmdbId);
          try {
            const created = await prisma.content.create({
              data: {
                id: generateShortId(),
                contentType: rec.contentType,
                title: rec.title,
                year: rec.year,
                posterUrl: rec.posterUrl,
                tmdbId: rec.tmdbId,
                tmdbRating: rec.tmdbRating,
                overview: rec.overview,
              }
            });
            return created.id;
          } catch { return null; }
        }));

        const validIds = contentIds.filter(Boolean) as string[];
        if (validIds.length > 0) {
          await prisma.userContent.createMany({
            data: validIds.map(cid => ({
              profileId,
              contentId: cid,
              listStatus: 'RECOMMENDED',
            })),
            skipDuplicates: true,
          });
        }
      } catch (e) {
        console.error('[rec-history] save failed:', e);
      }
    }

    return NextResponse.json({ recommendations: finalRecs, debug: { rawResponse: contentText } });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, rawResponse: contentText }, { status: 500 });
  }
}
