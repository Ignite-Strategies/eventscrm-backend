import { parse } from 'csv-parse/sync';

/**
 * Normalize field names from various formats to our schema
 */
function normalizeFieldName(fieldName) {
  const normalized = fieldName.toLowerCase().trim();
  
  // Common variations
  const fieldMap = {
    'first name': 'firstName',
    'firstname': 'firstName',
    'fname': 'firstName',
    'goes by': 'goesBy',
    'goesby': 'goesBy',
    'nickname': 'goesBy',
    'preferred name': 'goesBy',
    'last name': 'lastName', 
    'lastname': 'lastName',
    'lname': 'lastName',
    'email address': 'email',
    'emailaddress': 'email',
    'phone number': 'phone',
    'phonenumber': 'phone',
    'street address': 'street',
    'streetaddress': 'street',
    'zip code': 'zip',
    'zipcode': 'zip',
    'postal code': 'zip',
    'postalcode': 'zip',
    'company': 'employer',
    'organization': 'employer',
    'years with organization': 'yearsWithOrganization',
    'years with org': 'yearsWithOrganization',
    'yearswithorg': 'yearsWithOrganization',
    'category of engagement': 'categoryOfEngagement',
    'category': 'categoryOfEngagement',
    'engagement': 'categoryOfEngagement'
  };
  
  return fieldMap[normalized] || normalized;
}

/**
 * Parse CSV file and validate supporter data (MVP1 - simplified)
 */
export function parseContactsCSV(csvBuffer) {
  const records = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  const contacts = [];
  const errors = [];
  
  records.forEach((record, index) => {
    const lineNum = index + 2; // +2 for header + 0-index
    
    // Normalize all field names
    const normalizedRecord = {};
    Object.keys(record).forEach(key => {
      const normalizedKey = normalizeFieldName(key);
      normalizedRecord[normalizedKey] = record[key];
    });
    
    // Validate required fields
    if (!normalizedRecord.email) {
      errors.push({ line: lineNum, error: "Missing email" });
      return;
    }
    
    if (!normalizedRecord.firstname) {
      errors.push({ line: lineNum, error: "Missing firstName" });
      return;
    }
    
    if (!normalizedRecord.lastname) {
      errors.push({ line: lineNum, error: "Missing lastName" });
      return;
    }
    
    // Build supporter object (MVP1 - simplified)
    const supporter = {
      firstName: normalizedRecord.firstname,
      goesBy: normalizedRecord.goesby || "",
      lastName: normalizedRecord.lastname,
      email: normalizedRecord.email.toLowerCase().trim(),
      phone: normalizedRecord.phone || "",
      street: normalizedRecord.street || "",
      city: normalizedRecord.city || "",
      state: normalizedRecord.state || "",
      zip: normalizedRecord.zip || "",
      employer: normalizedRecord.employer || "",
      yearsWithOrganization: parseInt(normalizedRecord.yearswithorganization || "0") || 0,
      categoryOfEngagement: "general" // Default for CSV imports
    };
    
    contacts.push(supporter);
  });
  
  return { contacts, errors };
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

