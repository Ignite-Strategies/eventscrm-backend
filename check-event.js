import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkEvent() {
  try {
    // Get the Bros & Brews event
    const event = await prisma.event.findFirst({
      where: { name: { contains: 'Bros' } },
      select: {
        id: true,
        name: true,
        pipelines: true,
        attendees: {
          select: {
            currentStage: true,
            audienceType: true,
            contact: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });
    
    console.log('🔍 EVENT DATA:');
    console.log('ID:', event?.id);
    console.log('Name:', event?.name);
    console.log('Pipelines:', event?.pipelines);
    console.log('Attendees:', event?.attendees);
    
    // Also check what stages are actually being used
    const allStages = await prisma.eventAttendee.findMany({
      select: {
        currentStage: true
      },
      distinct: ['currentStage']
    });
    
    console.log('🔍 ALL STAGES IN USE:', allStages.map(s => s.currentStage));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEvent();
