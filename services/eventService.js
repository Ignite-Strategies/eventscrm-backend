import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

/**
 * SURGICAL EVENT CREATION
 * 
 * Takes a blob from the frontend and maps it to Prisma's exact schema.
 * Handles location separately, only passes Event fields to Prisma.
 */
export async function createEvent(orgId, rawData) {
  console.log('🔧 Event Service: Processing raw data...');
  
  // 1. Extract location fields (these DON'T go to Event model)
  const locationFields = {
    venueName: rawData.venueName,
    street: rawData.street,
    city: rawData.city,
    state: rawData.state,
    zip: rawData.zip
  };
  
  // 2. Handle location (create/find EventLocation or use customLocation)
  let locationId = null;
  let customLocation = null;
  
  if (locationFields.venueName) {
    console.log('🏢 Creating/finding venue:', locationFields.venueName);
    
    // Find or create EventLocation
    const location = await prisma.eventLocation.upsert({
      where: {
        orgId_venueName: {
          orgId,
          venueName: locationFields.venueName
        }
      },
      update: {
        timesUsed: { increment: 1 }
      },
      create: {
        orgId,
        ...locationFields,
        rating: 0,
        timesUsed: 1
      }
    });
    
    locationId = location.id;
    console.log('✅ Venue ID:', locationId);
  } else if (locationFields.street || locationFields.city) {
    // No venue name but has address - use customLocation
    customLocation = `${locationFields.street || ''}, ${locationFields.city || ''}, ${locationFields.state || ''} ${locationFields.zip || ''}`.trim();
    console.log('📍 Custom location:', customLocation);
  }
  
  // 3. Map ONLY Event model fields (Prisma-safe)
  const eventData = {
    orgId,
    name: rawData.name,
    slug: rawData.slug,
    description: rawData.description || null,
    date: rawData.date || null,
    time: rawData.time || null,
    
    // Location
    locationId,
    customLocation,
    
    // Tickets
    hasTickets: rawData.hasTickets || false,
    ticketCost: parseFloat(rawData.ticketCost) || 0,
    
    // Fundraising
    fundraisingGoal: parseFloat(rawData.fundraisingGoal) || 0,
    additionalExpenses: parseFloat(rawData.additionalExpenses) || 0,
    
    // Pipeline
    pipelines: rawData.pipelines || []
  };
  
  console.log('✅ Mapped event data for Prisma:', JSON.stringify(eventData, null, 2));
  
  // 4. Create event with ONLY valid fields
  const event = await prisma.event.create({
    data: eventData,
    include: {
      location: true // Include location in response
    }
  });
  
  console.log('🎉 Event created:', event.id);
  
  return event;
}

