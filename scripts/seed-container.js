import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

async function seedContainer() {
  console.log('🌱 Seeding Container...');

  try {
    // Check if container already exists
    const existingContainer = await prisma.container.findFirst({
      where: { name: 'F3 CRM' }
    });

    if (existingContainer) {
      console.log('✅ Container already exists:', existingContainer.id);
      return existingContainer;
    }

    // Create the container
    const container = await prisma.container.create({
      data: {
        name: 'F3 CRM',
        slug: 'f3-crm',
        description: 'F3 CRM Contact Container'
      }
    });

    console.log('🎉 Container created:', container.id);

    // Update all existing contacts to use this container
    const updateResult = await prisma.contact.updateMany({
      where: { containerId: null },
      data: { containerId: container.id }
    });

    console.log(`📋 Updated ${updateResult.count} contacts with containerId`);

    return container;

  } catch (error) {
    console.error('❌ Error seeding container:', error);
    // Don't throw if it's a connection error - allow graceful degradation
    if (error.code === 'P1001' || error.message?.includes("Can't reach database server")) {
      console.warn('⚠️  Database not available. Container seeding skipped.');
      return null;
    }
    throw error;
  } finally {
    try {
      await prisma.$disconnect();
    } catch (err) {
      // Ignore disconnect errors if connection failed
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedContainer();
}

export default seedContainer;
