/**
 * OrgMember CSV Field Mapper - Maps CSV headers to Contact + OrgMember fields
 * Uses universal Contact field mapping + adds OrgMember-specific fields
 */

import { mapContactFields } from './contactCsvFieldMapperService.js';

// OrgMember-specific field mappings (in addition to Contact fields)
const ORG_MEMBER_FIELD_MAP = {
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
  'tenure': 'yearsWithOrganization',
  
  // Chapter variations
  'chapter responsible for': 'chapterresponsiblefor',
  'chapter responsible': 'chapterresponsiblefor',
  'chapter': 'chapterresponsiblefor',
  'region': 'chapterresponsiblefor',
  'team': 'chapterresponsiblefor'
};

/**
 * Normalize OrgMember-specific field name
 */
export function normalizeOrgMemberFieldName(fieldName) {
  if (!fieldName || typeof fieldName !== 'string') {
    return 'unmapped';
  }
  
  const normalized = fieldName.toLowerCase().trim();
  return ORG_MEMBER_FIELD_MAP[normalized] || 'unmapped';
}

/**
 * Normalize all field names in a record
 * Uses universal Contact field mapping + OrgMember-specific fields
 */
export function normalizeRecord(record) {
  // First, use universal Contact field mapping (includes fullName parsing)
  const contactFields = mapContactFields(record);
  
  // Then add OrgMember-specific fields
  const orgMemberFields = {};
  Object.keys(record).forEach(key => {
    const normalizedKey = normalizeOrgMemberFieldName(key);
    if (normalizedKey !== 'unmapped') {
      orgMemberFields[normalizedKey] = record[key];
    }
  });
  
  // Combine Contact + OrgMember fields
  return {
    ...contactFields,
    ...orgMemberFields
  };
}

/**
 * Get field mapping for headers
 */
export function getFieldMapping(headers) {
  return headers.map(header => ({
    csvHeader: header,
    mappedField: normalizeOrgMemberFieldName(header)
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
    { value: 'yearsWithOrganization', label: 'Years With Organization' },
    { value: 'chapterresponsiblefor', label: 'Chapter Responsible For' }
  ];
}
