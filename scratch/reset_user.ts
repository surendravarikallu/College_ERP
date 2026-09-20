import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = 'subbi@gmail.com'; // Adjust if needed
  console.log(`Resetting lock for user: ${email}`);
  
  const user = await prisma.user.updateMany({
    where: { 
      email: { 
        contains: 'subbi',
        mode: 'insensitive' 
      } 
    },
    data: {
      failedLoginCount: 0,
      lockedUntil: null
    }
  });

  console.log(`Updated ${user.count} user(s).`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
