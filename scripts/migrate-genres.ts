import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting genre migration...');
  const contents = await prisma.content.findMany({
    select: { id: true, genres: true },
  });

  console.log(`Found ${contents.length} items to process.`);

  let updatedCount = 0;
  for (const item of contents) {
    const genres = item.genres as any;
    let genreNamesStr = '';

    if (Array.isArray(genres)) {
      // TMDB format: [{id: 1, name: "Action"}, ...] OR simple string array: ["Action", ...]
      const names = genres.map((g: any) => (typeof g === 'object' ? g.name : g)).filter(Boolean);
      if (names.length > 0) {
        genreNamesStr = `|${names.join('|')}|`;
      }
    }

    if (genreNamesStr) {
      await prisma.content.update({
        where: { id: item.id },
        data: { genreNames: genreNamesStr },
      });
      updatedCount++;
    }
  }

  console.log(`✅ Migration complete. Updated ${updatedCount} items.`);
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
