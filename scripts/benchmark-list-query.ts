/**
 * Benchmark all 3 list queries (watched, planned, recommendations history)
 * Run: npx tsx scripts/benchmark-list-query.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RUNS = 5;

async function getIds() {
  const watched = await prisma.userContent.findFirst({
    where: { listStatus: 'WATCHED' },
    select: { userId: true },
  });
  const planned = await prisma.userContent.findFirst({
    where: { listStatus: 'PLANNED' },
    select: { userId: true },
  });
  const rec = await prisma.userContent.findFirst({
    where: { listStatus: 'RECOMMENDED' },
    select: { userId: true },
  });
  return {
    watchedUserId: watched?.userId ?? null,
    plannedUserId: planned?.userId ?? null,
    recUserId: rec?.userId ?? null,
  };
}

async function bench(label: string, fn: () => Promise<any>) {
  await fn(); // warm-up
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const t = performance.now();
    await fn();
    times.push(performance.now() - t);
  }
  const avg = times.reduce((a, b) => a + b, 0) / RUNS;
  const min = Math.min(...times);
  const max = Math.max(...times);
  console.log(`${label}`);
  console.log(`  runs: ${times.map((t) => t.toFixed(1) + 'ms').join(', ')}`);
  console.log(`  avg: ${avg.toFixed(1)}ms  min: ${min.toFixed(1)}ms  max: ${max.toFixed(1)}ms\n`);
}

async function main() {
  const { watchedUserId, plannedUserId, recUserId } = await getIds();
  console.log();

  // ── Watched (already optimized) ──────────────────────────────────────────
  if (watchedUserId) {
    await bench('WATCHED — default (addedAt desc)', () =>
      prisma.userContent.findMany({
        where: { userId: watchedUserId, listStatus: 'WATCHED' },
        select: {
          id: true,
          userRating: true,
          watchStatus: true,
          notes: true,
          addedAt: true,
          content: {
            select: {
              id: true,
              title: true,
              year: true,
              posterUrl: true,
              backdropUrl: true,
              tagline: true,
              genres: true,
              tmdbRating: true,
              contentType: true,
              adult: true,
              revenue: true,
              languages: true,
              seasons: true,
              episodes: true,
              networks: true,
              episodeRuntime: true,
              runtimeMins: true,
              ageCertification: true,
              tmdbId: true,
              malId: true,
              enrichments: { where: { source: 'omdb' }, select: { data: true }, take: 1 },
            },
          },
        },
        orderBy: { addedAt: 'desc' },
        skip: 0,
        take: 24,
      }),
    );

    await bench('WATCHED — sorted by tmdbRating + MOVIE filter', () =>
      prisma.userContent.findMany({
        where: { userId: watchedUserId, listStatus: 'WATCHED', content: { contentType: 'MOVIE' } },
        select: {
          id: true,
          userRating: true,
          watchStatus: true,
          notes: true,
          addedAt: true,
          content: {
            select: {
              id: true,
              title: true,
              year: true,
              posterUrl: true,
              backdropUrl: true,
              tagline: true,
              genres: true,
              tmdbRating: true,
              contentType: true,
              adult: true,
              revenue: true,
              languages: true,
              seasons: true,
              episodes: true,
              networks: true,
              episodeRuntime: true,
              runtimeMins: true,
              ageCertification: true,
              tmdbId: true,
              malId: true,
              enrichments: { where: { source: 'omdb' }, select: { data: true }, take: 1 },
            },
          },
        },
        orderBy: { content: { tmdbRating: 'desc' } },
        skip: 0,
        take: 24,
      }),
    );
  }

  // ── Planned ───────────────────────────────────────────────────────────────
  if (plannedUserId) {
    await bench('PLANNED — default', () =>
      prisma.userContent.findMany({
        where: { userId: plannedUserId, listStatus: 'PLANNED' },
        select: {
          id: true,
          listStatus: true,
          addedAt: true,
          watchStatus: true,
          content: {
            select: {
              id: true,
              title: true,
              year: true,
              posterUrl: true,
              tmdbRating: true,
              tmdbId: true,
              malId: true,
              contentType: true,
              ageCertification: true,
              runtimeMins: true,
              episodeRuntime: true,
            },
          },
        },
        orderBy: { addedAt: 'desc' },
        skip: 0,
        take: 18,
      }),
    );
  }

  // ── Recommendations ───────────────────────────────────────────────────────
  if (recUserId) {
    await bench('RECOMMENDATIONS — default', () =>
      prisma.userContent.findMany({
        where: { userId: recUserId, listStatus: 'RECOMMENDED' },
        select: {
          id: true,
          listStatus: true,
          addedAt: true,
          userRating: true,
          recommendationReason: true,
          recommendationLabel: true,
          content: {
            select: {
              id: true,
              title: true,
              year: true,
              posterUrl: true,
              tmdbRating: true,
              tmdbId: true,
              malId: true,
              contentType: true,
              ageCertification: true,
              runtimeMins: true,
              episodeRuntime: true,
            },
          },
        },
        orderBy: { addedAt: 'desc' },
        skip: 0,
        take: 18,
      }),
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
