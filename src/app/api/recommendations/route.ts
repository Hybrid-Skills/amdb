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
  // 1. Attempt to find the LAST markdown code block (preferred for AI responses)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  const blocks = [...text.matchAll(codeBlockRegex)];
  
  if (blocks.length > 0) {
    return blocks[blocks.length - 1][1].trim();
  }

  // 2. Fallback: find the last JSON array of objects (starts with [{ or [ {)
  // Use lastIndexOf to skip any label-list notation like [UNDERRATED, ...] in thinking text
  const lastArrayStart = text.lastIndexOf('[');
  const lastArrayEnd = text.lastIndexOf(']');
  if (lastArrayStart !== -1 && lastArrayEnd > lastArrayStart) {
    return text.substring(lastArrayStart, lastArrayEnd + 1).trim();
  }

  return text.trim();
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { profileId, contentTypes, genres, model: requestedModel, specialInstructions } = await req.json();
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

  // contentTypes: ContentType[] — empty array means no filter (any type)
  const selectedTypes: ContentType[] = Array.isArray(contentTypes) && contentTypes.length > 0
    ? contentTypes as ContentType[]
    : [];

  let contentText = '';
  try {
    // 1. Fetch personalization data + Exclusion list
    const allProfileItems = await prisma.userContent.findMany({
      where: {
        profileId,
        content: selectedTypes.length > 0
          ? { contentType: { in: selectedTypes } }
          : undefined,
      },
      include: {
        content: { select: { title: true, year: true, contentType: true, genres: true } },
      },
      orderBy: { userRating: 'desc' },
      take: 50,
    });

    const watchedItems = allProfileItems.filter((i) => i.listStatus === 'WATCHED');
    const highRated = watchedItems.filter((i) => (i.userRating ?? 0) >= 7).slice(0, 15);
    const lowerRated = watchedItems.filter((i) => i.userRating != null && i.userRating < 7).slice(0, 5);
    const exclusionList = allProfileItems.map((i) => i.content.title).join(', ');
    const typeLabel = selectedTypes.length === 0
      ? 'movie, TV show, or anime'
      : selectedTypes.map((t) => t === 'TV_SHOW' ? 'TV show' : t === 'MOVIE' ? 'movie' : 'anime').join(' or ');

    const prompt = `You are a movie recommendation engine. Output ONLY valid JSON. No reasoning, no explanations, no markdown — just the raw JSON array.

Highly rated by user: ${highRated.map((i) => i.content.title).join(', ')}.
Disliked by user: ${lowerRated.map((i) => i.content.title).join(', ')}.
Genres: ${genres?.join(', ') || 'Any'}.
Already seen / excluded: ${exclusionList}.
${specialInstructions ? `Special instructions: ${specialInstructions}` : ''}

Task: Suggest exactly 6 ${typeLabel} titles the user has NOT seen.

Return a JSON array of exactly 6 objects. Each object must have:
- "title": string
- "year": number
- "reason": string (max 2 sentences, concise)
- "label": string (pick ONE from: UNDERRATED, CRITICALLY_ACCLAIMED, AWARD_WINNING, FAN_FAVORITE, CULT_CLASSIC, VISUAL_SPECTACLE, IMMERSIVE_SOUND, TECHNICAL_MASTERY, DIRECTORIAL_DEBUT, GENRE_DEFINING — max 2 titles sharing the same label)

Your entire response must be the JSON array. Start your response with [ and end with ].`;

    // 2. Start AI generation
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const genModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        responseMimeType: 'application/json',
        responseSchema: recommendationSchema as any,
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
