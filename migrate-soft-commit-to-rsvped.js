import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateSoftCommitToRsvped() {
  try {
    console.log('🔄 Migrating soft_commit → rsvped...\n');
    
    // Find all EventAttendees with soft_commit stage
    const attendees = await prisma.eventAttendee.findMany({
      where: {
        currentStage: 'soft_commit'
      }
    });
    
    console.log(`Found ${attendees.length} attendees with soft_commit stage`);
    
    if (attendees.length === 0) {
      console.log('✅ No records to migrate!');
      return;
    }
    
    // Update them to rsvped
    const result = await prisma.eventAttendee.updateMany({
      where: {
        currentStage: 'soft_commit'
      },
      data: {
        currentStage: 'rsvped'
      }
    });
    
    console.log(`\n✅ Migrated ${result.count} records from soft_commit → rsvped`);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateSoftCommitToRsvped();

