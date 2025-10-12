/**
 * FORK 1: OrgMember CSV Service
 * Extends BASE Contact service to add OrgMember extended fields
 * Used by: /api/orgmember/csv route
 */

import { mapContactFields, validateContactFields, upsertContact } from './contactCsvService.js';
import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

/**
 * ORG MEMBER EXTENDED FIELDS - Delta on top of Contact
 */
const ORG_MEMBER_FIELDS = {
  // Address variations
  'street': 'street',
  'street address': 'street',
  'address': 'street',
  
  'city': 'city',
  
  'state': 'state',
  'province': 'state',
  
  'zip': 'zip',
  'zip code': 'zip',
  'postal code': 'zip',
  
  // Employer variations
  'employer': 'employer',
  'company': 'employer',
  'organization': 'employer',
  'workplace': 'employer',
  
  // Years variations
  'years with organization': 'yearsWithOrganization',
  'years with org': 'yearsWithOrganization',
  'years': 'yearsWithOrganization',
  'tenure': 'yearsWithOrganization'
};

/**
 * Map OrgMember-specific fields from CSV record
 */
export function mapOrgMemberFields(csvRecord) {
  const orgMemberData = {};
  
  Object.keys(csvRecord).forEach(key => {
    const normalizedKey = key.toLowerCase().trim();
    const mappedField = ORG_MEMBER_FIELDS[normalizedKey];
    if (mappedField) {
      orgMemberData[mappedField] = csvRecord[key];
    }
  });
  
  return orgMemberData;
}

/**
 * FORK 1 CAPABILITY: Create OrgMember with Contact
 * Uses BASE Contact service + adds OrgMember extended data
 */
export async function createOrgMemberFromCsv(csvRecord, orgId) {
  console.log('🏢 ORGMEMBER FORK: Processing record for orgId:', orgId);
  
  // STEP 1: Create/Update Contact (BASE)
  const contactFields = mapContactFields(csvRecord);
  const validation = validateContactFields(contactFields);
  
  if (!validation.isValid) {
    throw new Error(`Contact validation failed: ${validation.errors.join(', ')}`);
  }
  
  const contact = await upsertContact(contactFields);
  
  // STEP 2: Add OrgMember extended data (FORK EXTENSION)
  const orgMemberFields = mapOrgMemberFields(csvRecord);
  
  console.log('🏢 ORGMEMBER FORK: Creating OrgMember for contact:', contact.id);
  
  const orgMember = await prisma.orgMember.upsert({
    where: { contactId: contact.id },
    update: orgMemberFields,
    create: {
      contactId: contact.id,
      orgId,
      ...orgMemberFields
    }
  });
  
  console.log('✅ ORGMEMBER FORK: Complete -', { contactId: contact.id, orgMemberId: orgMember.id });
  
  return { contact, orgMember };
}

/**
 * Bulk process OrgMember CSV records
 */
export async function bulkCreateOrgMembers(csvRecords, orgId) {
  const results = {
    created: 0,
    updated: 0,
    errors: []
  };
  
  console.log('🏢 ORGMEMBER BULK: Processing', csvRecords.length, 'records');
  
  for (const record of csvRecords) {
    try {
      const { contact, orgMember } = await createOrgMemberFromCsv(record, orgId);
      results.created++;
    } catch (error) {
      console.error('🏢 ORGMEMBER ERROR:', error.message);
      results.errors.push({
        record,
        error: error.message
      });
    }
  }
  
  console.log('✅ ORGMEMBER BULK: Complete -', results);
  return results;
}

/**
 * Get available OrgMember fields for dropdowns (Contact + Extended)
 */
export function getAvailableOrgMemberFields() {
  return [
    { value: 'unmapped', label: 'Ignore this column' },
    // Contact fields
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'goesBy', label: 'Goes By (Nickname)' },
    { value: 'email', label: 'Email Address' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'fullName', label: 'Full Name (will be split)' },
    // OrgMember extended fields
    { value: 'street', label: 'Street Address' },
    { value: 'city', label: 'City' },
    { value: 'state', label: 'State' },
    { value: 'zip', label: 'ZIP Code' },
    { value: 'employer', label: 'Employer/Company' },
    { value: 'yearsWithOrganization', label: 'Years With Organization' }
  ];
}

