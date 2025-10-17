import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testContacts() {
  try {
    console.log('🔍 Testing contacts in database...');
    
    // Get all contacts
    const allContacts = await prisma.contact.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        orgId: true,
        containerId: true,
        chapterResponsibleFor: true,
        goesBy: true
      }
    });
    
    console.log(`📊 Total contacts: ${allContacts.length}`);
    console.log('📊 All contacts:', JSON.stringify(allContacts, null, 2));
    
    // Check specific orgId
    const orgContacts = await prisma.contact.findMany({
      where: { orgId: 'cmgfvz9v10000nt284k875eoc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        orgId: true,
        containerId: true,
        chapterResponsibleFor: true
      }
    });
    
    console.log(`📊 Contacts for orgId cmgfvz9v10000nt284k875eoc: ${orgContacts.length}`);
    console.log('📊 Org contacts:', JSON.stringify(orgContacts, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testContacts();
