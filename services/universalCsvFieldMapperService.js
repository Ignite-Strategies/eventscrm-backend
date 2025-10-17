/**
 * UNIVERSAL CSV FIELD MAPPER SERVICE
 * Single source of truth for all CSV field mappings across all upload types
 * Explicit field support per upload type to prevent silent failures
 * 
 * Based on Prisma Schema:
 * - Contact: firstName, lastName, email, phone, goesBy, employer, street, city, state, zip, birthday, married, spouseName, numberOfKids
 * - OrgMember: yearsWithOrganization, leadershipRole, originStory, notes, tags
 * - EventAttendee: currentStage, audienceType, attended, ticketType, amountPaid, spouseOrOther, howManyInParty
 */

import { smartNameParse } from '../utils/nameParser.js';

/**
 * UNIVERSAL FIELD MAP - All possible field mappings
 * Each field is explicitly tagged with supported upload types
 */
export const UNIVERSAL_FIELD_MAP = {
  // === CONTACT FIELDS (Universal - apply to all) ===
  'first name': { field: 'firstName', types: ['contact', 'orgMember', 'eventAttendee'] },
  'firstname': { field: 'firstName', types: ['contact', 'orgMember', 'eventAttendee'] },
  'fname': { field: 'firstName', types: ['contact', 'orgMember', 'eventAttendee'] },
  'given name': { field: 'firstName', types: ['contact', 'orgMember', 'eventAttendee'] },
  
  'last name': { field: 'lastName', types: ['contact', 'orgMember', 'eventAttendee'] },
  'lastname': { field: 'lastName', types: ['contact', 'orgMember', 'eventAttendee'] },
  'lname': { field: 'lastName', types: ['contact', 'orgMember', 'eventAttendee'] },
  'surname': { field: 'lastName', types: ['contact', 'orgMember', 'eventAttendee'] },
  'family name': { field: 'lastName', types: ['contact', 'orgMember', 'eventAttendee'] },
  
  'full name': { field: 'fullName', types: ['contact', 'orgMember', 'eventAttendee'] },
  'fullname': { field: 'fullName', types: ['contact', 'orgMember', 'eventAttendee'] },
  'name': { field: 'fullName', types: ['contact', 'orgMember', 'eventAttendee'] },
  'complete name': { field: 'fullName', types: ['contact', 'orgMember', 'eventAttendee'] },
  
  'goes by': { field: 'goesBy', types: ['contact', 'orgMember', 'eventAttendee'] },
  'goesby': { field: 'goesBy', types: ['contact', 'orgMember', 'eventAttendee'] },
  'nickname': { field: 'goesBy', types: ['contact', 'orgMember', 'eventAttendee'] },
  'preferred name': { field: 'goesBy', types: ['contact', 'orgMember', 'eventAttendee'] },
  'preferredname': { field: 'goesBy', types: ['contact', 'orgMember', 'eventAttendee'] },
  
  'email': { field: 'email', types: ['contact', 'orgMember', 'eventAttendee'] },
  'email address': { field: 'email', types: ['contact', 'orgMember', 'eventAttendee'] },
  'emailaddress': { field: 'email', types: ['contact', 'orgMember', 'eventAttendee'] },
  'e-mail': { field: 'email', types: ['contact', 'orgMember', 'eventAttendee'] },
  
  'phone': { field: 'phone', types: ['contact', 'orgMember', 'eventAttendee'] },
  'phone number': { field: 'phone', types: ['contact', 'orgMember', 'eventAttendee'] },
  'phonenumber': { field: 'phone', types: ['contact', 'orgMember', 'eventAttendee'] },
  'mobile': { field: 'phone', types: ['contact', 'orgMember', 'eventAttendee'] },
  'cell': { field: 'phone', types: ['contact', 'orgMember', 'eventAttendee'] },
  'telephone': { field: 'phone', types: ['contact', 'orgMember', 'eventAttendee'] },
  
  'employer': { field: 'employer', types: ['contact', 'orgMember', 'eventAttendee'] },
  'company': { field: 'employer', types: ['contact', 'orgMember', 'eventAttendee'] },
  'workplace': { field: 'employer', types: ['contact', 'orgMember', 'eventAttendee'] },
  'job': { field: 'employer', types: ['contact', 'orgMember', 'eventAttendee'] },
  
  'street': { field: 'street', types: ['contact', 'orgMember', 'eventAttendee'] },
  'address': { field: 'street', types: ['contact', 'orgMember', 'eventAttendee'] },
  'street address': { field: 'street', types: ['contact', 'orgMember', 'eventAttendee'] },
  
  'city': { field: 'city', types: ['contact', 'orgMember', 'eventAttendee'] },
  'state': { field: 'state', types: ['contact', 'orgMember', 'eventAttendee'] },
  'province': { field: 'state', types: ['contact', 'orgMember', 'eventAttendee'] },
  
  'zip': { field: 'zip', types: ['contact', 'orgMember', 'eventAttendee'] },
  'zipcode': { field: 'zip', types: ['contact', 'orgMember', 'eventAttendee'] },
  'postal code': { field: 'zip', types: ['contact', 'orgMember', 'eventAttendee'] },
  
  'birthday': { field: 'birthday', types: ['contact', 'orgMember', 'eventAttendee'] },
  'birth date': { field: 'birthday', types: ['contact', 'orgMember', 'eventAttendee'] },
  'dob': { field: 'birthday', types: ['contact', 'orgMember', 'eventAttendee'] },
  
  'married': { field: 'married', types: ['contact', 'orgMember', 'eventAttendee'] },
  'marital status': { field: 'married', types: ['contact', 'orgMember', 'eventAttendee'] },
  
  'spouse name': { field: 'spouseName', types: ['contact', 'orgMember', 'eventAttendee'] },
  'spouse': { field: 'spouseName', types: ['contact', 'orgMember', 'eventAttendee'] },
  'partner': { field: 'spouseName', types: ['contact', 'orgMember', 'eventAttendee'] },
  
  'number of kids': { field: 'numberOfKids', types: ['contact', 'orgMember', 'eventAttendee'] },
  'kids': { field: 'numberOfKids', types: ['contact', 'orgMember', 'eventAttendee'] },
  'children': { field: 'numberOfKids', types: ['contact', 'orgMember', 'eventAttendee'] },
  
  // === ORG MEMBER SPECIFIC FIELDS (NOW IN CONTACT!) ===
  'years with organization': { field: 'yearsWithOrganization', types: ['contact', 'orgMember'] },
  'years with org': { field: 'yearsWithOrganization', types: ['contact', 'orgMember'] },
  'yearswithorg': { field: 'yearsWithOrganization', types: ['contact', 'orgMember'] },
  'years': { field: 'yearsWithOrganization', types: ['contact', 'orgMember'] },
  'tenure': { field: 'yearsWithOrganization', types: ['contact', 'orgMember'] },
  
  'leadership role': { field: 'leadershipRole', types: ['contact', 'orgMember'] },
  'role': { field: 'leadershipRole', types: ['contact', 'orgMember'] },
  'position': { field: 'leadershipRole', types: ['contact', 'orgMember'] },
  
  'origin story': { field: 'originStory', types: ['contact', 'orgMember'] },
  'how they joined': { field: 'originStory', types: ['contact', 'orgMember'] },
  
  'notes': { field: 'notes', types: ['contact', 'orgMember'] },
  'comments': { field: 'notes', types: ['contact', 'orgMember'] },
  
  'chapter responsible for': { field: 'chapterResponsibleFor', types: ['contact', 'orgMember'] },
  'chapter responsible': { field: 'chapterResponsibleFor', types: ['contact', 'orgMember'] },
  'chapter': { field: 'chapterResponsibleFor', types: ['contact', 'orgMember'] },
  'region': { field: 'chapterResponsibleFor', types: ['contact', 'orgMember'] },
  'team': { field: 'chapterResponsibleFor', types: ['contact', 'orgMember'] },
  
  // === EVENT ATTENDEE SPECIFIC FIELDS ===
  'audience type': { field: 'audienceType', types: ['contact', 'eventAttendee'] },
  'audience': { field: 'audienceType', types: ['contact', 'eventAttendee'] },
  'contact type': { field: 'audienceType', types: ['contact', 'eventAttendee'] },
  
  'current stage': { field: 'currentStage', types: ['contact', 'eventAttendee'] },
  'stage': { field: 'currentStage', types: ['contact', 'eventAttendee'] },
  'pipeline stage': { field: 'currentStage', types: ['contact', 'eventAttendee'] },
  'status': { field: 'currentStage', types: ['contact', 'eventAttendee'] },
  
  'attended': { field: 'attended', types: ['contact', 'eventAttendee'] },
  'checked in': { field: 'attended', types: ['contact', 'eventAttendee'] },
  
  'ticket type': { field: 'ticketType', types: ['eventAttendee'] },
  'ticket': { field: 'ticketType', types: ['eventAttendee'] },
  'registration type': { field: 'ticketType', types: ['eventAttendee'] },
  
  'amount paid': { field: 'amountPaid', types: ['eventAttendee'] },
  'paid': { field: 'amountPaid', types: ['eventAttendee'] },
  'payment': { field: 'amountPaid', types: ['eventAttendee'] },
  
  'spouse or other': { field: 'spouseOrOther', types: ['eventAttendee'] },
  'bringing': { field: 'spouseOrOther', types: ['eventAttendee'] },
  
  'how many in party': { field: 'howManyInParty', types: ['eventAttendee'] },
  'party size': { field: 'howManyInParty', types: ['eventAttendee'] },
  'total attendees': { field: 'howManyInParty', types: ['eventAttendee'] }
};

/**
 * Map fields for a specific upload type
 * Only includes fields that are explicitly supported for that type
 */
export function mapFieldsForType(csvRecord, uploadType) {
  const mappedRecord = {};
  
  Object.keys(csvRecord).forEach(csvHeader => {
    const normalizedHeader = csvHeader.toLowerCase().trim();
    const fieldMapping = UNIVERSAL_FIELD_MAP[normalizedHeader];
    
    // Only map if this field is supported for this upload type
    if (fieldMapping && fieldMapping.types.includes(uploadType)) {
      mappedRecord[fieldMapping.field] = csvRecord[csvHeader];
    }
  });
  
  // fullName parsing is now handled by the CSV reader service
  
  return mappedRecord;
}

/**
 * Get available fields for a specific upload type
 */
export function getAvailableFieldsForType(uploadType) {
  const fields = new Set();
  
  Object.values(UNIVERSAL_FIELD_MAP).forEach(fieldMapping => {
    if (fieldMapping.types.includes(uploadType)) {
      fields.add(fieldMapping.field);
    }
  });
  
  return Array.from(fields).map(field => ({
    value: field,
    label: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')
  }));
}

/**
 * Validate that required fields are present for a specific upload type
 */
export function validateRequiredFieldsForType(mappedRecord, uploadType) {
  const errors = [];
  
  // Universal Contact requirements
  if (!mappedRecord.firstName) errors.push('firstName is required');
  if (!mappedRecord.lastName) errors.push('lastName is required');
  if (!mappedRecord.email) errors.push('email is required');
  
  // Upload type specific requirements
  if (uploadType === 'orgMember') {
    // Add orgMember specific validations if needed
  }
  
  if (uploadType === 'eventAttendee') {
    // Add eventAttendee specific validations if needed
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate a mapped record for required fields
 */
export function validateMappedRecord(mappedRecord, uploadType) {
  const errors = [];
  
  // Universal required fields (apply to all types)
  if (!mappedRecord.email) {
    errors.push('Email is required');
  }
  
  // Name validation - at least firstName OR lastName must be present (fullName gets parsed immediately)
  if (!mappedRecord.firstName && !mappedRecord.lastName) {
    errors.push('At least one name field (firstName or lastName) is required');
  }
  
  // Type-specific validations
  if (uploadType === 'orgMember') {
    // OrgMember specific validations can go here
  }
  
  if (uploadType === 'eventAttendee') {
    // EventAttendee specific validations can go here
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get field mapping suggestions for headers
 */
export function getFieldMappingSuggestions(headers, uploadType) {
  return headers.map(header => {
    const normalizedHeader = header.toLowerCase().trim();
    const fieldMapping = UNIVERSAL_FIELD_MAP[normalizedHeader];
    
    return {
      csvHeader: header,
      suggestedField: fieldMapping && fieldMapping.types.includes(uploadType) 
        ? fieldMapping.field 
        : 'unmapped',
      isSupported: fieldMapping && fieldMapping.types.includes(uploadType)
    };
  });
}

/**
 * CSV TO CONTACT MAPPER - Converts CSV data to Contact model format
 * Sets containerId, orgId, eventId, audienceType, currentStage
 */
export function mapCsvToContact(mappedRecord, uploadType, orgId, eventId) {
  // Default containerId (F3 CRM)
  const containerId = 'cmgu7w02h0000ceaqt7iz6bf9';
  
  // CONTACT-FIRST: Everything goes into Contact model!
  const contactData = {
    // Universal contact fields
    firstName: mappedRecord.firstName || '',
    lastName: mappedRecord.lastName || '',
    email: mappedRecord.email || '',
    phone: mappedRecord.phone || '',
    goesBy: mappedRecord.goesBy || '',
    employer: mappedRecord.employer || '',
    street: mappedRecord.street || '',
    city: mappedRecord.city || '',
    state: mappedRecord.state || '',
    zip: mappedRecord.zip || '',
    birthday: mappedRecord.birthday || null,
    married: mappedRecord.married || undefined, // Now optional Boolean
    spouseName: mappedRecord.spouseName || undefined,
    numberOfKids: mappedRecord.numberOfKids || undefined,
    
    // Org-specific fields (now in Contact!)
    yearsWithOrganization: mappedRecord.yearsWithOrganization || null,
    leadershipRole: mappedRecord.leadershipRole || '',
    originStory: mappedRecord.originStory || '',
    notes: mappedRecord.notes || '',
    tags: mappedRecord.tags || '',
    chapterResponsibleFor: mappedRecord.chapterResponsibleFor || '',
    
    // Event-specific fields (now in Contact!)
    currentStage: mappedRecord.currentStage || 'aware',
    audienceType: mappedRecord.audienceType || 'org_members',
    attended: mappedRecord.attended || undefined, // Now optional Boolean
    ticketType: mappedRecord.ticketType || undefined,
    amountPaid: mappedRecord.amountPaid || undefined, // Now optional Float
    spouseOrOther: mappedRecord.spouseOrOther || undefined,
    howManyInParty: mappedRecord.howManyInParty || undefined, // Int? field, use undefined
    
    // CONTACT-FIRST: Set containerId, orgId, eventId
    containerId: containerId,
    orgId: orgId || null,
    eventId: eventId || null
  };
  
  // NO MORE separate tables! Everything in Contact!
  return { contactData };
}
