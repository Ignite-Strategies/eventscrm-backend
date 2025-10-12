/**
 * BASE Contact CSV Service
 * Universal Contact field mapping, validation, and creation
 * Used by all CSV upload forks (OrgMember, EventAttendee, etc.)
 */

import { getPrismaClient } from '../config/database.js';
import { smartNameParse } from '../utils/nameParser.js';

const prisma = getPrismaClient();

/**
 * CONTACT FIELD MAP - The universal identity fields
 */
export const CONTACT_FIELDS = {
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
 * This is the SINGLE PLACE where Contact fields are mapped
 */
export function mapContactFields(csvRecord) {
  const contact = {};
  
  Object.keys(csvRecord).forEach(key => {
    const normalizedKey = key.toLowerCase().trim();
    const mappedField = CONTACT_FIELDS[normalizedKey];
    if (mappedField) {
      contact[mappedField] = csvRecord[key];
    }
  });
  
  // SINGLE PLACE for fullName parsing
  if (contact.fullName && (!contact.firstName || !contact.lastName)) {
    const parsed = smartNameParse(contact.fullName);
    contact.firstName = contact.firstName || parsed.firstName;
    contact.lastName = contact.lastName || parsed.lastName;
    delete contact.fullName;
  }
  
  return contact;
}

/**
 * Validate Contact fields
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

/**
 * BASE: Upsert Contact record
 * This is the UNIVERSAL operation - creates or updates Contact
 */
export async function upsertContact(contactData) {
  const { firstName, lastName, goesBy, email, phone } = contactData;
  
  console.log('📇 BASE CONTACT: Upserting contact:', { email, firstName, lastName });
  
  const contact = await prisma.contact.upsert({
    where: { email },
    update: { 
      firstName, 
      lastName, 
      goesBy, 
      phone 
    },
    create: { 
      firstName, 
      lastName, 
      goesBy, 
      email, 
      phone 
    }
  });
  
  console.log('✅ BASE CONTACT: Contact upserted:', contact.id);
  return contact;
}

/**
 * Get available Contact fields for dropdowns
 */
export function getAvailableContactFields() {
  return [
    { value: 'unmapped', label: 'Ignore this column' },
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'goesBy', label: 'Goes By (Nickname)' },
    { value: 'email', label: 'Email Address' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'fullName', label: 'Full Name (will be split)' }
  ];
}

