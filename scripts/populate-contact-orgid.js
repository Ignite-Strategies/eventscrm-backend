import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

async function populateContactOrgIds() {
  console.log('🔄 Starting Contact orgId population...');

  try {
    // Get all OrgMembers with contactId
    const orgMembers = await prisma.orgMember.findMany({
      where: {
        contactId: { not: null }
      },
      select: {
        id: true,
        contactId: true,
        orgId: true
      }
    });

    console.log(`📋 Found ${orgMembers.length} OrgMembers with contactId`);

    // Update each Contact with the orgId from their OrgMember
    for (const orgMember of orgMembers) {
      if (orgMember.contactId) {
        await prisma.contact.update({
          where: { id: orgMember.contactId },
          data: { orgId: orgMember.orgId }
        });
        console.log(`✅ Updated Contact ${orgMember.contactId} with orgId ${orgMember.orgId}`);
      }
    }

    console.log('🎉 Contact orgId population complete!');

    // Verify the results
    const contactsWithOrgId = await prisma.contact.count({
      where: { orgId: { not: null } }
    });
    console.log(`📊 Total contacts with orgId: ${contactsWithOrgId}`);

  } catch (error) {
    console.error('❌ Error populating Contact orgIds:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateContactOrgIds();
