const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const enrichment = await prisma.contentEnrichment.findFirst({
    where: { type: 'OMDB' }
  });
  console.log('Enrichment data sample:', JSON.stringify(enrichment?.data, null, 2));

  const watchEnrichment = await prisma.contentEnrichment.findFirst({
    where: { type: 'WATCH_PROVIDERS' }
  });
  console.log('Watch Providers data sample:', JSON.stringify(watchEnrichment?.data, null, 2));
}

check().then(() => prisma.$disconnect());
