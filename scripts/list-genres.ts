import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.content.findMany({
    select: { genreNames: true },
    where: { genreNames: { not: null } },
  });
  const all = new Set<string>();
  for (const r of rows) {
    if (!r.genreNames) continue;
    for (const g of r.genreNames.split('|').filter(Boolean)) all.add(g);
  }
  console.log([...all].sort().join('\n'));
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
