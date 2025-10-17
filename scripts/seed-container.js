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
    console.log('📋 Container details:', {
      id: container.id,
      name: container.name,
      slug: container.slug
    });

    return container;

  } catch (error) {
    console.error('❌ Error seeding container:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedContainer();
}

export default seedContainer;
