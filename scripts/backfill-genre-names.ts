/**
 * Backfill genreNames for all content rows, normalizing "Science Fiction" → "Sci-Fi"
 * Run: npx tsx scripts/backfill-genre-names.ts
 */
import { PrismaClient } from '@prisma/client';
import { buildGenreNames } from '../src/lib/genres';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.content.findMany({
    where: { genres: { not: undefined } },
    select: { id: true, genres: true, genreNames: true },
  });

  let updated = 0;
  for (const row of rows) {
    const genres = row.genres as { id: number; name: string }[] | null;
    if (!genres || genres.length === 0) continue;
    const fresh = buildGenreNames(genres);
    if (fresh !== row.genreNames) {
      await prisma.content.update({ where: { id: row.id }, data: { genreNames: fresh } });
      console.log(`Updated ${row.id}: ${row.genreNames} → ${fresh}`);
      updated++;
    }
  }
  console.log(`\nDone. Updated ${updated} / ${rows.length} rows.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
