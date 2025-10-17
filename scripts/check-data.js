import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

async function checkData() {
  console.log('🔍 CHECKING DATA STRUCTURE...\n');

  try {
    // Check Contact table
    const contactCount = await prisma.contact.count();
    console.log(`📊 Contact table: ${contactCount} records`);

    if (contactCount > 0) {
      const sampleContact = await prisma.contact.findFirst({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          orgId: true,
          eventId: true
        }
      });
      console.log('📋 Sample Contact:', sampleContact);
    }

    // Check OrgMember table
    const orgMemberCount = await prisma.orgMember.count();
    console.log(`📊 OrgMember table: ${orgMemberCount} records`);

    if (orgMemberCount > 0) {
      const sampleOrgMember = await prisma.orgMember.findFirst({
        select: {
          id: true,
          contactId: true,
          orgId: true
        }
      });
      console.log('📋 Sample OrgMember:', sampleOrgMember);
    }

    // Check EventAttendee table
    const eventAttendeeCount = await prisma.eventAttendee.count();
    console.log(`📊 EventAttendee table: ${eventAttendeeCount} records`);

    if (eventAttendeeCount > 0) {
      const sampleEventAttendee = await prisma.eventAttendee.findFirst({
        select: {
          id: true,
          contactId: true,
          eventId: true,
          orgId: true
        }
      });
      console.log('📋 Sample EventAttendee:', sampleEventAttendee);
    }

    // Check what orgIds exist
    const orgIds = await prisma.organization.findMany({
      select: { id: true, name: true }
    });
    console.log('📊 Organizations:', orgIds);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
