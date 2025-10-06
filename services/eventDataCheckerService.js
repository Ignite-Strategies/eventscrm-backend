/**
 * EVENT DATA CHECKER SERVICE
 * 
 * Validates and cleans frontend data before it hits Prisma.
 * NO transformation, just validation and type safety.
 * 
 * Rule: Frontend field names MUST match Prisma Event model exactly!
 */

export function validateAndCleanEventData(rawData, orgPipelineDefaults) {
  console.log('🔍 Validating event data...');
  
  // Build the exact Event model shape
  const eventData = {
    // Required fields
    name: cleanString(rawData.name),
    slug: cleanString(rawData.slug),
    
    // Optional text fields
    description: cleanString(rawData.description) || null,
    date: cleanString(rawData.date) || null,
    time: cleanString(rawData.time) || null,
    
    // Event location fields (prefixed with 'event')
    eventVenueName: cleanString(rawData.eventVenueName) || null,
    eventStreet: cleanString(rawData.eventStreet) || null,
    eventCity: cleanString(rawData.eventCity) || null,
    eventState: cleanString(rawData.eventState) || null,
    eventZip: cleanString(rawData.eventZip) || null,
    
    // Boolean fields
    hasTickets: Boolean(rawData.hasTickets),
    
    // Number fields (ensure they're floats, not strings)
    ticketCost: parseFloat(rawData.ticketCost) || 0,
    fundraisingGoal: parseFloat(rawData.fundraisingGoal) || 0,
    additionalExpenses: parseFloat(rawData.additionalExpenses) || 0,
    
    // Array fields
    pipelines: Array.isArray(rawData.pipelines) 
      ? rawData.pipelines 
      : orgPipelineDefaults || []
  };
  
  // Validate required fields
  if (!eventData.name) {
    throw new Error('Event name is required');
  }
  if (!eventData.slug) {
    throw new Error('Event slug is required');
  }
  
  console.log('✅ Event data validated and cleaned');
  console.log('📋 Final data:', JSON.stringify(eventData, null, 2));
  
  return eventData;
}

/**
 * Clean string - trim and handle empty strings
 */
function cleanString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

