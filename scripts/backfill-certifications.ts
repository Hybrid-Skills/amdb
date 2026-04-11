/**
 * Backfill contentRatings and re-derive ageCertification (IN → US fallback)
 * for all Content rows. Fetches /release_dates or /content_ratings from TMDB.
 *
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-certifications.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY!;

async function fetchCertifications(
  tmdbId: number,
  contentType: 'MOVIE' | 'TV_SHOW' | 'ANIME',
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};

  try {
    if (contentType === 'MOVIE') {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbId}/release_dates?api_key=${TMDB_API_KEY}`,
      );
      const data = await res.json();
      for (const entry of data.results ?? []) {
        const cert = entry.release_dates?.find((d: any) => d.certification)?.certification;
        if (cert) map[entry.iso_3166_1] = cert;
      }
    } else {
      const res = await fetch(
        `https://api.themoviedb.org/3/tv/${tmdbId}/content_ratings?api_key=${TMDB_API_KEY}`,
      );
      const data = await res.json();
      for (const entry of data.results ?? []) {
        if (entry.rating) map[entry.iso_3166_1] = entry.rating;
      }
    }
  } catch (e) {
    console.error(`  TMDB fetch failed for tmdbId ${tmdbId}:`, e);
  }

  return map;
}

function getDisplayCert(map: Record<string, string>): string | null {
  return map['IN'] ?? map['US'] ?? Object.values(map)[0] ?? null;
}

async function main() {
  const rows = await prisma.content.findMany({
    where: { tmdbId: { not: null } },
    select: { id: true, tmdbId: true, contentType: true, ageCertification: true },
  });

  console.log(`Backfilling ${rows.length} rows…`);
  let updated = 0;

  for (const row of rows) {
    const allRatings = await fetchCertifications(
      row.tmdbId!,
      row.contentType as 'MOVIE' | 'TV_SHOW' | 'ANIME',
    );

    if (Object.keys(allRatings).length === 0) continue;

    const displayCert = getDisplayCert(allRatings);

    await prisma.content.update({
      where: { id: row.id },
      data: {
        contentRatings: allRatings,
        ageCertification: displayCert,
      },
    });

    updated++;
    if (updated % 20 === 0) console.log(`  ${updated}/${rows.length} done`);

    // Respect TMDB rate limit (40 req/10s)
    await new Promise((r) => setTimeout(r, 260));
  }

  console.log(`Done. Updated ${updated} rows.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
