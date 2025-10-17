import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

async function giveEveryoneOrgId() {
  console.log('🔄 Giving everyone the same orgId...');

  try {
    // Get your org ID (the one from your data: cmgfvz9v10000nt284k875eoc)
    const YOUR_ORG_ID = 'cmgfvz9v10000nt284k875eoc';
    
    console.log(`📋 Using orgId: ${YOUR_ORG_ID}`);

    // Get all contacts and give them the orgId
    const contacts = await prisma.contact.findMany({
      select: { id: true, firstName: true, lastName: true }
    });

    console.log(`📊 Found ${contacts.length} contacts to update`);

    for (const contact of contacts) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { 
          containerId: YOUR_ORG_ID,  // Universal contact relationship
          orgId: YOUR_ORG_ID,       // If they're an org member
          // eventId will be set separately for those attending events
        }
      });
      console.log(`✅ Updated ${contact.firstName} ${contact.lastName} with containerId + orgId`);
    }

    console.log('🎉 Everyone now has the same orgId!');

    // Verify
    const contactsWithOrgId = await prisma.contact.count({
      where: { orgId: YOUR_ORG_ID }
    });
    console.log(`📊 Total contacts with orgId: ${contactsWithOrgId}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

giveEveryoneOrgId();
