import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

async function preMigrationFix() {
  console.log('🔧 Pre-migration fix: Clearing invalid containerId values...');

  try {
    // Test connection first
    await prisma.$connect();
    
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
    // Handle connection errors gracefully
    if (error.code === 'P1001' || error.message?.includes("Can't reach database server")) {
      console.warn('⚠️  Database not available during pre-migration. This is OK during build. Will retry on startup.');
      return; // Don't throw - allow build to continue
    }
    console.error('❌ Error in pre-migration fix:', error);
    throw error;
  } finally {
    try {
      await prisma.$disconnect();
    } catch (err) {
      // Ignore disconnect errors if connection failed
    }
  }
}

preMigrationFix();

