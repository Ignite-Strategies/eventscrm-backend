import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

async function preMigrationFix() {
  console.log('🔧 Pre-migration fix: Clearing invalid containerId values...');

  try {
    // Clear all containerId values that don't have corresponding Container records
    const result = await prisma.contact.updateMany({
      where: {
        containerId: {
          not: null
        }
      },
      data: {
        containerId: null
      }
    });

    console.log(`✅ Cleared ${result.count} invalid containerId values`);

  } catch (error) {
    console.error('❌ Error in pre-migration fix:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

preMigrationFix();

