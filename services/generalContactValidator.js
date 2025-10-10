/**
 * General Contact CSV Validator - Pure validation logic for Contact data
 * No database calls, no side effects, just validation for Contact model
 */

/**
 * Validate email format
 */
export function isValidContactEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate required fields for a Contact record
 */
export function validateContactRecord(record, lineNumber) {
  const errors = [];
  
  // Required field validation (firstName, lastName, email required for Contact)
  if (!record.firstName || record.firstName.trim() === '') {
    errors.push({
      line: lineNumber,
      error: 'Missing firstName',
      field: 'firstName'
    });
  }
  
  if (!record.lastName || record.lastName.trim() === '') {
    errors.push({
      line: lineNumber,
      error: 'Missing lastName', 
      field: 'lastName'
    });
  }
  
  if (!record.email || record.email.trim() === '') {
    errors.push({
      line: lineNumber,
      error: 'Missing email',
      field: 'email'
    });
  } else if (!isValidContactEmail(record.email)) {
    errors.push({
      line: lineNumber,
      error: 'Invalid email format',
      field: 'email',
      value: record.email
    });
  }
  
  return errors;
}

/**
 * Clean and format Contact data
 */
export function cleanContactData(record) {
  return {
    firstName: record.firstName ? record.firstName.trim() : '',
    lastName: record.lastName ? record.lastName.trim() : '',
    email: record.email ? record.email.toLowerCase().trim() : '',
    phone: record.phone ? record.phone.trim() : null
  };
}

/**
 * Validate and clean a batch of Contact records
 */
export function validateContactBatch(records) {
  console.log('🔍 CONTACT VALIDATOR: Starting validation of', records.length, 'records');
  console.log('🔍 CONTACT VALIDATOR: First record sample:', records[0]);
  
  const validRecords = [];
  const errors = [];
  
  records.forEach((record, index) => {
    const lineNumber = index + 2; // +2 for header + 0-index
    
    // Validate required fields
    const validationErrors = validateContactRecord(record, lineNumber);
    
    if (validationErrors.length > 0) {
      console.log('🔍 CONTACT VALIDATOR: Record', lineNumber, 'has errors:', validationErrors);
      errors.push(...validationErrors);
    } else {
      // Clean and add to valid records
      const cleanedRecord = cleanContactData(record);
      console.log('🔍 CONTACT VALIDATOR: Record', lineNumber, 'cleaned:', cleanedRecord);
      validRecords.push(cleanedRecord);
    }
  });
  
  console.log('🔍 CONTACT VALIDATOR: Final results:', {
    totalProcessed: records.length,
    validCount: validRecords.length,
    errorCount: errors.length
  });
  
  return {
    validRecords,
    errors,
    totalProcessed: records.length,
    validCount: validRecords.length,
    errorCount: errors.length
  };
}
