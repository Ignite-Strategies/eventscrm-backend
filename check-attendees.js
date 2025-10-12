import { getPrismaClient } from './config/database.js';

const prisma = getPrismaClient();

console.log('🔍 Checking EventAttendees...');

const attendees = await prisma.eventAttendee.findMany({
  include: {
    contact: true
  }
});

console.log('📊 Total EventAttendees:', attendees.length);

attendees.forEach((attendee, i) => {
  console.log(`${i+1}. EventAttendee ID: ${attendee.id}`);
  console.log(`   EventId: ${attendee.eventId}`);
  console.log(`   ContactId: ${attendee.contactId}`);
  console.log(`   AudienceType: ${attendee.audienceType}`);
  console.log(`   CurrentStage: ${attendee.currentStage}`);
  console.log(`   Contact exists: ${!!attendee.contact}`);
  
  if (attendee.contact) {
    console.log(`   Contact name: ${attendee.contact.firstName} ${attendee.contact.lastName}`);
    console.log(`   Contact email: ${attendee.contact.email}`);
  } else {
    console.log('   ⚠️ NO CONTACT DATA!');
  }
  console.log('---');
});

// Also check contacts table
console.log('\n🔍 Checking Contacts...');
const contacts = await prisma.contact.findMany();
console.log('📊 Total Contacts:', contacts.length);

contacts.forEach((contact, i) => {
  console.log(`${i+1}. Contact ID: ${contact.id}`);
  console.log(`   Name: ${contact.firstName} ${contact.lastName}`);
  console.log(`   Email: ${contact.email}`);
  console.log(`   OrgId: ${contact.orgId}`);
});

await prisma.$disconnect();
