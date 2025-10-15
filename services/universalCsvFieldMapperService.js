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
  
  // === ORG MEMBER SPECIFIC FIELDS ===
  'years with organization': { field: 'yearsWithOrganization', types: ['orgMember'] },
  'years with org': { field: 'yearsWithOrganization', types: ['orgMember'] },
  'yearswithorg': { field: 'yearsWithOrganization', types: ['orgMember'] },
  'years': { field: 'yearsWithOrganization', types: ['orgMember'] },
  'tenure': { field: 'yearsWithOrganization', types: ['orgMember'] },
  
  'leadership role': { field: 'leadershipRole', types: ['orgMember'] },
  'role': { field: 'leadershipRole', types: ['orgMember'] },
  'position': { field: 'leadershipRole', types: ['orgMember'] },
  
  'origin story': { field: 'originStory', types: ['orgMember'] },
  'how they joined': { field: 'originStory', types: ['orgMember'] },
  
  'notes': { field: 'notes', types: ['orgMember'] },
  'comments': { field: 'notes', types: ['orgMember'] },
  
  // === EVENT ATTENDEE SPECIFIC FIELDS ===
  'audience type': { field: 'audienceType', types: ['eventAttendee'] },
  'audience': { field: 'audienceType', types: ['eventAttendee'] },
  'contact type': { field: 'audienceType', types: ['eventAttendee'] },
  
  'current stage': { field: 'currentStage', types: ['eventAttendee'] },
  'stage': { field: 'currentStage', types: ['eventAttendee'] },
  'pipeline stage': { field: 'currentStage', types: ['eventAttendee'] },
  'status': { field: 'currentStage', types: ['eventAttendee'] },
  
  'attended': { field: 'attended', types: ['eventAttendee'] },
  'checked in': { field: 'attended', types: ['eventAttendee'] },
  
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
  
  // Universal fullName parsing (applies to all types that support it)
  if (mappedRecord.fullName && (!mappedRecord.firstName || !mappedRecord.lastName)) {
    const parsed = smartNameParse(mappedRecord.fullName);
    
    if (!mappedRecord.firstName) {
      mappedRecord.firstName = parsed.firstName;
    }
    if (!mappedRecord.lastName) {
      mappedRecord.lastName = parsed.lastName;
    }
    
    // Remove fullName after parsing
    delete mappedRecord.fullName;
  }
  
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
 * UNIVERSAL SAVE - Split mapped record into Contact, OrgMember, and EventAttendee data
 * This is the key to making saves universal across all upload types
 */
export function splitRecordForSave(mappedRecord, uploadType) {
  // Contact fields (universal personhood)
  const contactFields = [
    'firstName', 'lastName', 'email', 'phone', 'goesBy', 
    'employer', 'street', 'city', 'state', 'zip',
    'birthday', 'married', 'spouseName', 'numberOfKids'
  ];
  
  // OrgMember fields (org-specific relationship)
  const orgMemberFields = [
    'yearsWithOrganization', 'leadershipRole', 'originStory', 'notes', 'tags'
  ];
  
  // EventAttendee fields (event-specific relationship)
  const eventAttendeeFields = [
    'currentStage', 'audienceType', 'attended', 'ticketType', 
    'amountPaid', 'spouseOrOther', 'howManyInParty'
  ];
  
  const contactData = {};
  const orgMemberData = {};
  const eventAttendeeData = {};
  
  // Split the mapped record
  Object.keys(mappedRecord).forEach(field => {
    if (contactFields.includes(field)) {
      contactData[field] = mappedRecord[field];
    }
    if (orgMemberFields.includes(field) && uploadType === 'orgMember') {
      orgMemberData[field] = mappedRecord[field];
    }
    if (eventAttendeeFields.includes(field) && uploadType === 'eventAttendee') {
      eventAttendeeData[field] = mappedRecord[field];
    }
  });
  
  return {
    contactData,
    orgMemberData: uploadType === 'orgMember' ? orgMemberData : null,
    eventAttendeeData: uploadType === 'eventAttendee' ? eventAttendeeData : null
  };
}
