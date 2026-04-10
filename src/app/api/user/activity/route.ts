import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type Period = '7d' | '30d' | '3m' | '1y';

const INTERVAL: Record<Period, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '3m': '3 months',
  '1y': '1 year',
};

type Row = { date: string; contentType: string; count: number };

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const period = (url.searchParams.get('period') ?? '7d') as Period;
  const interval = INTERVAL[period] ?? '7 days';
  const userId = session.user.id;

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('day', uc."addedAt"), 'YYYY-MM-DD') AS date,
      c."contentType" AS "contentType",
      COUNT(*)::int AS count
    FROM "UserContent" uc
    JOIN "Content" c ON c.id = uc."contentId"
    WHERE uc."userId" = ${userId}
      AND uc."addedAt" >= NOW() - CAST(${interval} AS INTERVAL)
    GROUP BY DATE_TRUNC('day', uc."addedAt"), c."contentType"
    ORDER BY date ASC
  `;

  // Build full date range with zeros for missing days
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '3m' ? 90 : 365;
  const dateMap: Record<string, { MOVIE: number; TV_SHOW: number; ANIME: number }> = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dateMap[key] = { MOVIE: 0, TV_SHOW: 0, ANIME: 0 };
  }

  for (const row of rows) {
    if (dateMap[row.date]) {
      const ct = row.contentType as 'MOVIE' | 'TV_SHOW' | 'ANIME';
      if (ct in dateMap[row.date]) dateMap[row.date][ct] = row.count;
    }
  }

  const data = Object.entries(dateMap).map(([date, counts]) => ({ date, ...counts }));

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'private, max-age=120' },
  });
}
