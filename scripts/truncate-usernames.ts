import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const users = await prisma.user.findMany({
    where: {
      username: { not: null },
    },
    select: {
      id: true,
      username: true,
    },
  });

  console.log(`Checking ${users.length} users for long usernames...`);

  for (const user of users) {
    if (user.username && user.username.length > 20) {
      const base = user.username.substring(0, 20);
      let finalUsername = base;
      let isTaken = true;
      let count = 1;

      console.log(`Truncating: "${user.username}" (length ${user.username.length})`);

      while (isTaken) {
        const existing = await prisma.user.findFirst({
          where: {
            username: { equals: finalUsername, mode: 'insensitive' },
            NOT: { id: user.id },
          },
        });

        if (!existing) {
          isTaken = false;
        } else {
          // Collision handling
          const suffix = `_${count}`;
          finalUsername = base.substring(0, 20 - suffix.length) + suffix;
          count++;
        }
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { username: finalUsername },
      });

      console.log(`   -> New handle: "${finalUsername}"`);
    }
  }

  console.log('Cleanup complete.');
  await prisma.$disconnect();
}

main().catch(console.error);
