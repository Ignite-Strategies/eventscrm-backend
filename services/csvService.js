import { parse } from 'csv-parse/sync';

/**
 * Parse CSV file and validate supporter data (HubSpot-style)
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
    if (!record.email && !record.Email) {
      errors.push({ line: lineNum, error: "Missing email" });
      return;
    }
    
    if (!record.firstName && !record.FirstName) {
      errors.push({ line: lineNum, error: "Missing firstName" });
      return;
    }
    
    if (!record.lastName && !record.LastName) {
      errors.push({ line: lineNum, error: "Missing lastName" });
      return;
    }
    
    // Build supporter object
    const supporter = {
      firstName: record.firstName || record.FirstName,
      lastName: record.lastName || record.LastName,
      email: (record.email || record.Email).toLowerCase().trim(),
      phone: record.phone || record.Phone || "",
      street: record.street || record.Street || "",
      city: record.city || record.City || "",
      state: record.state || record.State || "",
      zip: record.zip || record.Zip || "",
      employer: record.employer || record.Employer || "",
      yearsWithOrganization: parseInt(record.yearsWithOrganization || record.YearsWithOrganization || "0") || 0,
      eventsAttended: parseInt(record.eventsAttended || record.EventsAttended || "0") || 0,
      categoryOfEngagement: record.categoryOfEngagement || record.CategoryOfEngagement || "general",
      pipeline: record.pipeline || record.Pipeline || "prospect",
      tags: []
    };
    
    // Parse tags if present
    if (record.tags || record.Tags) {
      const tagString = record.tags || record.Tags;
      // Handle both quoted and unquoted formats
      const cleanedTags = tagString.replace(/^"|"$/g, '').trim();
      supporter.tags = cleanedTags.split(',').map(t => t.trim()).filter(t => t);
    }
    
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

