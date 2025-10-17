import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

async function populateContainerId() {
  console.log('🔄 Starting containerId population...');

  try {
    // Step 1: Get all OrgMembers and populate containerId with their orgId
    console.log('📋 Step 1: Populating from OrgMembers...');
    const orgMembers = await prisma.orgMember.findMany({
      where: { contactId: { not: null } },
      select: { contactId: true, orgId: true }
    });

    for (const orgMember of orgMembers) {
      if (orgMember.contactId) {
        await prisma.contact.update({
          where: { id: orgMember.contactId },
          data: { containerId: orgMember.orgId }
        });
        console.log(`✅ Updated Contact ${orgMember.contactId} with containerId ${orgMember.orgId}`);
      }
    }

    // Step 2: Get all EventAttendees and populate containerId with their orgId
    console.log('📋 Step 2: Populating from EventAttendees...');
    const eventAttendees = await prisma.eventAttendee.findMany({
      where: { 
        contactId: { not: null },
        orgId: { not: null }
      },
      select: { contactId: true, orgId: true }
    });

    for (const eventAttendee of eventAttendees) {
      if (eventAttendee.contactId) {
        await prisma.contact.update({
          where: { id: eventAttendee.contactId },
          data: { containerId: eventAttendee.orgId }
        });
        console.log(`✅ Updated Contact ${eventAttendee.contactId} with containerId ${eventAttendee.orgId}`);
      }
    }

    console.log('🎉 ContainerId population complete!');

    // Verify results
    const contactsWithContainerId = await prisma.contact.count({
      where: { containerId: { not: null } }
    });
    console.log(`📊 Total contacts with containerId: ${contactsWithContainerId}`);

    // Show sample
    const sampleContacts = await prisma.contact.findMany({
      where: { containerId: { not: null } },
      select: { id: true, firstName: true, lastName: true, containerId: true },
      take: 3
    });
    console.log('📋 Sample contacts:', sampleContacts);

  } catch (error) {
    console.error('❌ Error populating containerId:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateContainerId();

