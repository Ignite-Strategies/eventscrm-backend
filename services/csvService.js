import { parse } from 'csv-parse/sync';

/**
 * Parse CSV file and validate contact data
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
    
    // Validate required fields
    if (!record.email) {
      errors.push({ line: lineNum, error: "Missing email" });
      return;
    }
    
    if (!record.name && !record.Name) {
      errors.push({ line: lineNum, error: "Missing name" });
      return;
    }
    
    // Normalize field names (handle case variations)
    const contact = {
      name: record.name || record.Name,
      email: (record.email || record.Email).toLowerCase().trim(),
      phone: record.phone || record.Phone || "",
      tags: []
    };
    
    // Parse tags if present
    if (record.tags || record.Tags) {
      const tagString = record.tags || record.Tags;
      contact.tags = tagString.split(',').map(t => t.trim()).filter(t => t);
    }
    
    contacts.push(contact);
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

