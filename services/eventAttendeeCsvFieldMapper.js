/**
 * General Contact CSV Field Normalizer - Maps various CSV headers to Contact schema fields
 * Pure function - no side effects, just field mapping for Contact model
 */

import { smartNameParse } from '../utils/nameParser.js';

const CONTACT_FIELD_MAP = {
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
 * Normalize a single field name for Contact model
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
 */
export function normalizeContactRecord(record) {
  const normalized = {};
  
  Object.keys(record).forEach(key => {
    const normalizedKey = normalizeContactFieldName(key);
    normalized[normalizedKey] = record[key];
  });
  
  // Parse fullName if it exists and firstName/lastName are missing
  if (normalized.fullName && (!normalized.firstName || !normalized.lastName)) {
    const parsedName = smartNameParse(normalized.fullName);
    
    // Only use parsed names if we don't already have firstName/lastName
    if (!normalized.firstName) {
      normalized.firstName = parsedName.firstName;
    }
    if (!normalized.lastName) {
      normalized.lastName = parsedName.lastName;
    }
    
    // Remove fullName from final record since we've parsed it
    delete normalized.fullName;
  }
  
  return normalized;
}

/**
 * Get field mapping for headers for Contact model
 */
export function getContactFieldMapping(headers) {
  return headers.map(header => ({
    csvHeader: header,
    mappedField: normalizeContactFieldName(header)
  }));
}

/**
 * Get available field options for Contact model dropdowns
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

