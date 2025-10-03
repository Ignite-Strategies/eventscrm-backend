/**
 * CSV Field Normalizer - Maps various CSV headers to our schema fields
 * Pure function - no side effects, just field mapping
 */

const FIELD_MAP = {
  // First Name variations
  'first name': 'firstName',
  'firstname': 'firstName',
  'fname': 'firstName',
  'given name': 'firstName',
  
  // Goes By variations
  'goes by': 'goesBy',
  'goesby': 'goesBy',
  'nickname': 'goesBy',
  'preferred name': 'goesBy',
  'preferredname': 'goesBy',
  
  // Last Name variations
  'last name': 'lastName',
  'lastname': 'lastName',
  'lname': 'lastName',
  'surname': 'lastName',
  'family name': 'lastName',
  
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
  
  // Address variations
  'street': 'street',
  'street address': 'street',
  'streetaddress': 'street',
  'address': 'street',
  'address line 1': 'street',
  
  'city': 'city',
  'state': 'state',
  'province': 'state',
  
  'zip': 'zip',
  'zip code': 'zip',
  'zipcode': 'zip',
  'postal code': 'zip',
  'postalcode': 'zip',
  
  // Employer variations
  'employer': 'employer',
  'company': 'employer',
  'organization': 'employer',
  'workplace': 'employer',
  'job': 'employer',
  
  // Years variations
  'years with organization': 'yearsWithOrganization',
  'years with org': 'yearsWithOrganization',
  'yearswithorg': 'yearsWithOrganization',
  'years': 'yearsWithOrganization',
  'tenure': 'yearsWithOrganization'
};

/**
 * Normalize a single field name
 */
export function normalizeFieldName(fieldName) {
  if (!fieldName || typeof fieldName !== 'string') {
    return 'unmapped';
  }
  
  const normalized = fieldName.toLowerCase().trim();
  return FIELD_MAP[normalized] || 'unmapped';
}

/**
 * Normalize all field names in a record
 */
export function normalizeRecord(record) {
  const normalized = {};
  
  Object.keys(record).forEach(key => {
    const normalizedKey = normalizeFieldName(key);
    normalized[normalizedKey] = record[key];
  });
  
  return normalized;
}

/**
 * Get field mapping for headers
 */
export function getFieldMapping(headers) {
  return headers.map(header => ({
    csvHeader: header,
    mappedField: normalizeFieldName(header)
  }));
}

/**
 * Get available field options for dropdowns
 */
export function getAvailableFields() {
  return [
    { value: 'unmapped', label: 'Ignore this column' },
    { value: 'firstName', label: 'First Name' },
    { value: 'goesBy', label: 'Goes By (Nickname)' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'email', label: 'Email Address' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'street', label: 'Street Address' },
    { value: 'city', label: 'City' },
    { value: 'state', label: 'State' },
    { value: 'zip', label: 'ZIP Code' },
    { value: 'employer', label: 'Employer/Company' },
    { value: 'yearsWithOrganization', label: 'Years With Organization' }
  ];
}
