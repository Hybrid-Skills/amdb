import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { ContentType } from '@prisma/client';

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
      label: { 
        type: SchemaType.STRING,
        description: 'Qualitative marker for the content. Must be one of: UNDERRATED, CRITICALLY_ACCLAIMED, AWARD_WINNING, FAN_FAVORITE, CULT_CLASSIC, VISUAL_SPECTACLE, IMMERSIVE_SOUND, TECHNICAL_MASTERY, DIRECTORIAL_DEBUT, GENRE_DEFINING.'
      },
    },
    required: ['title', 'year', 'reason', 'label'],
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

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId: session.user.id },
  });
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const model: AllowedModel = ALLOWED_MODELS.has(requestedModel)
    ? (requestedModel as AllowedModel)
    : 'gemma-4-31b-it';

  let contentText = '';
  try {
    // 1. Fetch personalization data + Exclusion list
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
      take: 50, // Pruned from 200 for Gemma speed
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

Suggest exactly 6 ${typeLabel} titles the user has NOT seen. 
Return JSON array of objects with:
- "title" (string)
- "year" (number)
- "reason" (string) - Keep each "reason" extremely concise (maximum 2 sentences).
- "label" (string) - Choose at most ONE label from this list ONLY if strongly applicable. Use exactly these strings: [UNDERRATED, CRITICALLY_ACCLAIMED, AWARD_WINNING, FAN_FAVORITE, CULT_CLASSIC, VISUAL_SPECTACLE, IMMERSIVE_SOUND, TECHNICAL_MASTERY, DIRECTORIAL_DEBUT, GENRE_DEFINING].
- IMPORTANT: Diversify labels. Use at most 2 titles per same label in this list.`;

    // 2. Start AI generation
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const isGemini = model.startsWith('gemini');
    const genModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature: isGemini ? 0.7 : 0.2, // Optimized for Gemma speed
        maxOutputTokens: 1000, // Buffered from 600 to prevent truncation
        responseMimeType: isGemini ? 'application/json' : undefined,
        responseSchema: isGemini ? (recommendationSchema as any) : undefined,
      },
    });

    const result = await genModel.generateContent(prompt);
    const resultResponse = await result.response;
    contentText = resultResponse.text().trim();

    // 3. Robust JSON extraction
    const cleanedJson = extractJson(contentText);
    const recs: { title: string; year: number; reason: string; label: string }[] = JSON.parse(cleanedJson);
    const finalRecsList = Array.isArray(recs) ? recs : (recs as any).recommendations || [];

    // Return raw suggestions for client-side enrichment
    return NextResponse.json({ recommendations: finalRecsList, debug: { rawResponse: contentText } });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, rawResponse: contentText }, { status: 500 });
  }
}
