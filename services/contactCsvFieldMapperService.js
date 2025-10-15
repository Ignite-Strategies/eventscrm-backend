/**
 * SHARED CONTACT FIELD MAPPER - Universal Personhood
 * Single source of truth for Contact field mapping across all CSV uploads
 * 
 * Used by:
 * - OrgMember CSV uploads (Contact + OrgMember fields)
 * - EventAttendee CSV uploads (Contact fields only)
 * - Future Contact-based uploads
 */

import { smartNameParse } from '../utils/nameParser.js';

/**
 * CONTACT FIELD MAP - The universal identity fields
 * This is the SINGLE PLACE where Contact field mapping is defined
 */
export const CONTACT_FIELD_MAP = {
  // First Name variations
  'first name': 'firstName',
  'firstname': 'firstName',
  'fname': 'firstName',
  'given name': 'firstName',
  
  // Last Name variations
  'last name': 'lastName',
  'lastname': 'lastName',
  'lname': 'lastName',
  'surname': 'lastName',
  'family name': 'lastName',
  
  // Goes By variations
  'goes by': 'goesBy',
  'goesby': 'goesBy',
  'nickname': 'goesBy',
  'preferred name': 'goesBy',
  'preferredname': 'goesBy',
  
  // Email variations
  'email': 'email',
  'email address': 'email',
  'emailaddress': 'email',
  'e-mail': 'email',
  
  // Phone variations
  'phone': 'phone',
  'phone number': 'phone',
  'phonenumber': 'phone',
  'mobile': 'phone',
  'cell': 'phone',
  'telephone': 'phone',
  
  // Full Name variations (will be parsed into firstName/lastName)
  'full name': 'fullName',
  'fullname': 'fullName',
  'name': 'fullName',
  'complete name': 'fullName'
};

/**
 * Map Contact fields from CSV record
 * This is the UNIVERSAL function for Contact field mapping
 * 
 * @param {Object} csvRecord - Raw CSV record with headers as keys
 * @returns {Object} Normalized Contact fields
 */
export function mapContactFields(csvRecord) {
  const contact = {};
  
  Object.keys(csvRecord).forEach(key => {
    const normalizedKey = key.toLowerCase().trim();
    const mappedField = CONTACT_FIELD_MAP[normalizedKey];
    if (mappedField) {
      contact[mappedField] = csvRecord[key];
    }
  });
  
  // SINGLE PLACE for fullName parsing - applies to ALL Contact uploads
  if (contact.fullName && (!contact.firstName || !contact.lastName)) {
    const parsed = smartNameParse(contact.fullName);
    
    // Only use parsed names if we don't already have firstName/lastName
    if (!contact.firstName) {
      contact.firstName = parsed.firstName;
    }
    if (!contact.lastName) {
      contact.lastName = parsed.lastName;
    }
    
    // Remove fullName from final record since we've parsed it
    delete contact.fullName;
  }
  
  return contact;
}

/**
 * Normalize a single field name for Contact model
 * Used by frontend dropdowns and field mapping UIs
 */
export function normalizeContactFieldName(fieldName) {
  if (!fieldName || typeof fieldName !== 'string') {
    return 'unmapped';
  }
  
  const normalized = fieldName.toLowerCase().trim();
  return CONTACT_FIELD_MAP[normalized] || 'unmapped';
}

/**
 * Normalize all field names in a record for Contact model
 * This is the main entry point for Contact field normalization
 */
export function normalizeContactRecord(record) {
  return mapContactFields(record);
}

/**
 * Get field mapping for headers for Contact model
 * Used by frontend preview and field mapping UIs
 */
export function getContactFieldMapping(headers) {
  return headers.map(header => ({
    csvHeader: header,
    mappedField: normalizeContactFieldName(header)
  }));
}

/**
 * Get available field options for Contact model dropdowns
 * This is what the frontend uses for field mapping dropdowns
 */
export function getAvailableContactFields() {
  return [
    { value: 'unmapped', label: 'Ignore this column' },
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'goesBy', label: 'Goes By (Nickname)' },
    { value: 'email', label: 'Email Address' },
    { value: 'phone', label: 'Phone Number' }
  ];
}

/**
 * Validate Contact fields
 * Universal validation for all Contact records
 */
export function validateContactFields(contact) {
  const errors = [];
  
  if (!contact.firstName) errors.push('firstName is required');
  if (!contact.lastName) errors.push('lastName is required');
  if (!contact.email) errors.push('email is required');
  
  // Basic email validation
  if (contact.email && !contact.email.includes('@')) {
    errors.push('Invalid email format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
