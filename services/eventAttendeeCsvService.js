/**
 * FORK 2: EventAttendee CSV Service
 * Extends BASE Contact service to create EventAttendee relationships
 * Used by: /api/contacts/event/upload route
 */

import { mapContactFields, validateContactFields, upsertContact } from './contactCsvService.js';
import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

/**
 * FORK 2 CAPABILITY: Create EventAttendee with Contact
 * Uses BASE Contact service + creates EventAttendee relationship
 */
export async function createEventAttendeeFromCsv(csvRecord, orgId, eventId, audienceType, currentStage) {
  console.log('🎟️  EVENTATTENDEE FORK: Processing record for event:', eventId);
  
  // STEP 1: Create/Update Contact (BASE)
  const contactFields = mapContactFields(csvRecord);
  const validation = validateContactFields(contactFields);
  
  if (!validation.isValid) {
    throw new Error(`Contact validation failed: ${validation.errors.join(', ')}`);
  }
  
  const contact = await upsertContact(contactFields);
  
  // STEP 2: Create EventAttendee relationship (FORK EXTENSION)
  console.log('🎟️  EVENTATTENDEE FORK: Creating EventAttendee for contact:', contact.id);
  
  const eventAttendee = await prisma.eventAttendee.upsert({
    where: {
      eventId_contactId_audienceType: {
        eventId,
        contactId: contact.id,
        audienceType
      }
    },
    update: {
      currentStage
    },
    create: {
      orgId,
      eventId,
      contactId: contact.id,
      audienceType,
      currentStage
    }
  });
  
  console.log('✅ EVENTATTENDEE FORK: Complete -', { contactId: contact.id, attendeeId: eventAttendee.id });
  
  return { contact, eventAttendee };
}

/**
 * Bulk process EventAttendee CSV records
 */
export async function bulkCreateEventAttendees(csvRecords, orgId, eventId, audienceType, currentStage) {
  const results = {
    created: 0,
    updated: 0,
    errors: []
  };
  
  console.log('🎟️  EVENTATTENDEE BULK: Processing', csvRecords.length, 'records');
  console.log('🎟️  Event:', eventId, '| Audience:', audienceType, '| Stage:', currentStage);
  
  for (const record of csvRecords) {
    try {
      const { contact, eventAttendee } = await createEventAttendeeFromCsv(
        record, 
        orgId, 
        eventId, 
        audienceType, 
        currentStage
      );
      results.created++;
    } catch (error) {
      console.error('🎟️  EVENTATTENDEE ERROR:', error.message);
      results.errors.push({
        record,
        error: error.message
      });
    }
  }
  
  console.log('✅ EVENTATTENDEE BULK: Complete -', results);
  return results;
}

