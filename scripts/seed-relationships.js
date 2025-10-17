import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

async function seedRelationships() {
  console.log('🌱 Seeding relationships...');

  try {
    // First, create the F3 CRM container
    const container = await prisma.container.upsert({
      where: { name: 'F3 CRM' },
      update: {},
      create: {
        name: 'F3 CRM',
        slug: 'f3-crm',
        description: 'F3 CRM Contact Container'
      }
    });

    console.log('✅ Container ready:', container.id);

    // Update all contacts with the containerId
    const updateResult = await prisma.contact.updateMany({
      where: { containerId: null },
      data: { containerId: container.id }
    });

    console.log(`✅ Updated ${updateResult.count} contacts with containerId`);

    // Also set orgId for everyone (since they were all org members)
    const orgUpdateResult = await prisma.contact.updateMany({
      where: { orgId: null },
      data: { orgId: 'cmgfvz9v10000nt284k875eoc' }
    });

    console.log(`✅ Updated ${orgUpdateResult.count} contacts with orgId`);

    // Verify the results
    const totalContacts = await prisma.contact.count();
    const contactsWithContainer = await prisma.contact.count({
      where: { containerId: { not: null } }
    });
    const contactsWithOrg = await prisma.contact.count({
      where: { orgId: { not: null } }
    });

    console.log('📊 Final stats:');
    console.log(`   Total contacts: ${totalContacts}`);
    console.log(`   With containerId: ${contactsWithContainer}`);
    console.log(`   With orgId: ${contactsWithOrg}`);

    console.log('🎉 Relationships seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding relationships:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedRelationships();

