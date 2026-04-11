import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

export interface ContentTypeStats {
  count: number;
  totalMins: number;
}

export interface ProfileStats {
  watched: {
    MOVIE: ContentTypeStats;
    TV_SHOW: ContentTypeStats;
    ANIME: ContentTypeStats;
    totalCount: number;
    totalMins: number;
    avgRating: number | null;
    reviewCount: number;
  };
  planned: {
    MOVIE: ContentTypeStats;
    TV_SHOW: ContentTypeStats;
    ANIME: ContentTypeStats;
    totalCount: number;
    estimatedMins: number;
  };
  score: number; // for gamification: totalWatched + reviewCount
}

type WatchedRow = {
  contentType: string;
  count: number;
  totalMins: number;
  avgRating: number | null;
  reviewCount: number;
};

type PlannedRow = {
  contentType: string;
  count: number;
  estimatedMins: number;
};

async function computeProfileStats(userId: string): Promise<ProfileStats> {
  const [watchedRows, plannedRows] = await Promise.all([
    prisma.$queryRaw<WatchedRow[]>`
      SELECT
        c."contentType",
        COUNT(uc.id)::int AS count,
        COALESCE(SUM(
          CASE
            WHEN c."contentType" = 'MOVIE' THEN COALESCE(c."runtimeMins", 0)
            ELSE COALESCE(uc."seasonsCompleted", c."episodes", 0)
                 * COALESCE(c."episodeRuntime", 0)
          END
        ), 0)::int AS "totalMins",
        AVG(uc."userRating")::float AS "avgRating",
        COUNT(CASE WHEN uc."userRating" IS NOT NULL AND uc."notes" IS NOT NULL AND uc."notes" != '' THEN 1 END)::int AS "reviewCount"
      FROM "UserContent" uc
      JOIN "Content" c ON c.id = uc."contentId"
      WHERE uc."userId" = ${userId}
        AND uc."listStatus" = 'WATCHED'
      GROUP BY c."contentType"
    `,
    prisma.$queryRaw<PlannedRow[]>`
      SELECT
        c."contentType",
        COUNT(uc.id)::int AS count,
        COALESCE(SUM(
          CASE
            WHEN c."contentType" = 'MOVIE' THEN COALESCE(c."runtimeMins", 0)
            ELSE COALESCE(c."episodes", 0) * COALESCE(c."episodeRuntime", 0)
          END
        ), 0)::int AS "estimatedMins"
      FROM "UserContent" uc
      JOIN "Content" c ON c.id = uc."contentId"
      WHERE uc."userId" = ${userId}
        AND uc."listStatus" = 'PLANNED'
      GROUP BY c."contentType"
    `,
  ]);

  const emptyType: ContentTypeStats = { count: 0, totalMins: 0 };

  const watched = {
    MOVIE: emptyType,
    TV_SHOW: emptyType,
    ANIME: emptyType,
    totalCount: 0,
    totalMins: 0,
    avgRating: null as number | null,
    reviewCount: 0,
  };

  let totalRatingSum = 0;
  let totalRatedCount = 0;

  for (const row of watchedRows) {
    const key = row.contentType as 'MOVIE' | 'TV_SHOW' | 'ANIME';
    watched[key] = { count: row.count, totalMins: row.totalMins };
    watched.totalCount += row.count;
    watched.totalMins += row.totalMins;
    watched.reviewCount += row.reviewCount;
    if (row.avgRating !== null) {
      totalRatingSum += row.avgRating * row.count;
      totalRatedCount += row.count;
    }
  }

  if (totalRatedCount > 0) {
    watched.avgRating = Math.round((totalRatingSum / totalRatedCount) * 10) / 10;
  }

  const planned = {
    MOVIE: { count: 0, totalMins: 0 },
    TV_SHOW: { count: 0, totalMins: 0 },
    ANIME: { count: 0, totalMins: 0 },
    totalCount: 0,
    estimatedMins: 0,
  };

  for (const row of plannedRows) {
    const key = row.contentType as 'MOVIE' | 'TV_SHOW' | 'ANIME';
    planned[key] = { count: row.count, totalMins: row.estimatedMins };
    planned.totalCount += row.count;
    planned.estimatedMins += row.estimatedMins;
  }

  return {
    watched,
    planned,
    score: watched.totalCount + watched.reviewCount,
  };
}

export function getProfileStats(userId: string): Promise<ProfileStats> {
  return unstable_cache(() => computeProfileStats(userId), [`user-stats-${userId}`], {
    revalidate: 60,
    tags: [`user-stats-${userId}`],
  })();
}
