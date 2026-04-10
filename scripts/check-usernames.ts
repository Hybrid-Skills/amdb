import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const longUsers = await prisma.user.findMany({
    where: {
      username: {
        not: null,
      },
    },
    select: {
      id: true,
      username: true,
    },
  });

  const filtered = longUsers.filter((u) => u.username && u.username.length > 20);

  console.log(`Found ${filtered.length} users with usernames > 20 chars:`);
  filtered.forEach((u) => console.log(`- ${u.username} (${u.id})`));

  await prisma.$disconnect();
}

main();
