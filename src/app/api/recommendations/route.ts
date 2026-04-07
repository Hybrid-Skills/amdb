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

export const maxDuration = 45;

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

/**
 * Ultra-robust JSON extractor that handles markdown blocks, comments, and trailing commas.
 */
function extractJson(text: string) {
  // 1. Strip markdown code blocks if present
  let cleaned = text.replace(/```json\s?([\s\S]*?)```/g, '$1').trim();
  if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/```([\s\S]*?)```/g, '$1').trim();
  }

  // 2. Find the largest block between [ ] or { }
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);

  // Prioritize array if found, otherwise object
  let jsonCandidate = arrayMatch ? arrayMatch[0] : (objectMatch ? objectMatch[0] : cleaned);

  // 3. Remove single-line comments (//) and multi-line comments (/* */)
  jsonCandidate = jsonCandidate
    .replace(/\/\/.*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // 4. Remove trailing commas before ] or }
  jsonCandidate = jsonCandidate
    .replace(/,\s*\]/g, ']')
    .replace(/,\s*\}/g, '}');

  return jsonCandidate.trim();
}

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

  let contentText = '';
  try {
    // Single query: fetch ALL items for this profile across all states.
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
    });

    const watchedItems = allProfileItems.filter((i) => i.listStatus === 'WATCHED');
    const highRated = watchedItems
      .filter((i) => (i.userRating ?? 0) >= 7)
      .slice(0, 20)
      .map((i) => `"${i.content.title}" (${i.content.year ?? '?'}) — ${i.userRating}/10`);

    const lowerRated = watchedItems
      .filter((i) => i.userRating != null && i.userRating < 7)
      .slice(0, 10)
      .map((i) => `"${i.content.title}" (${i.content.year ?? '?'}) — ${i.userRating}/10`);

    const allExcludedTitles = allProfileItems.map((i) => `"${i.content.title}"`).join(', ');

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

Suggest exactly 6 ${typeLabel} titles the user has NOT seen that match their tastes. Return a JSON array of objects with "title", "year" (number), and "reason" (string).`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Non-Gemini models (Gemma) might not support responseMimeType/schema flags
    const isGemini = model.startsWith('gemini');
    const genModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature: isGemini ? 0.7 : 0.8, // Slightly higher for gemma to help it track instructions better
        maxOutputTokens: 1000,
        responseMimeType: isGemini ? 'application/json' : undefined,
        responseSchema: isGemini ? (recommendationSchema as any) : undefined,
      },
    });

    const result = await genModel.generateContent(prompt);
    const resultResponse = await result.response;
    contentText = resultResponse.text().trim();

    let recs: { title: string; year: number; reason: string }[] = [];

    try {
      const cleanedJson = extractJson(contentText);
      const parsed = JSON.parse(cleanedJson);
      recs = Array.isArray(parsed) ? parsed : (parsed.recommendations || []);
    } catch (e) {
      // Emergency logging for assistant debugging
      try {
        const logPath = path.join(process.cwd(), 'public', 'debug_rec.txt');
        fs.writeFileSync(logPath, `TIMESTAMP: ${new Date().toISOString()}\nMODEL: ${model}\nERROR: ${e instanceof Error ? e.message : 'Unknown'}\nRAW RESPONSE:\n${contentText}`);
      } catch (logErr) {
        console.error('Failed to write debug log:', logErr);
      }
      
      console.error('Failed to parse AI JSON. Content:', contentText);
      throw new Error(`Failed to parse AI response. Raw output was: ${contentText.substring(0, 500)}...`);
    }

    if (!recs || recs.length === 0) {
      throw new Error(`AI returned no recommendations. Raw output: ${contentText}`);
    }

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
    
    return NextResponse.json({ 
      recommendations: finalRecs,
      debug: { rawResponse: contentText } 
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate recommendations';
    console.error('Recommendation error:', err);
    return NextResponse.json({ 
      error: message,
      rawResponse: contentText 
    }, { status: 500 });
  }
}
