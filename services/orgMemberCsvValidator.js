/**
 * CSV Validator - Pure validation logic for supporter data
 * No database calls, no side effects, just validation
 */

/**
 * Validate email format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate required fields for a supporter record
 */
export function validateSupporterRecord(record, lineNumber) {
  const errors = [];
  
  // Required field validation (only firstName and lastName required)
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
  
  // Email is optional but if provided, must be valid
  if (record.email && record.email.trim() !== '' && !isValidEmail(record.email)) {
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
 * Clean and format supporter data
 */
export function cleanSupporterData(record) {
  return {
    firstName: record.firstName ? record.firstName.trim() : '',
    goesBy: record.goesBy ? record.goesBy.trim() : '',
    lastName: record.lastName ? record.lastName.trim() : '',
    email: record.email ? record.email.toLowerCase().trim() : '',
    phone: record.phone ? record.phone.trim() : '',
    street: record.street ? record.street.trim() : '',
    city: record.city ? record.city.trim() : '',
    state: record.state ? record.state.trim() : '',
    zip: record.zip ? record.zip.trim() : '',
    employer: record.employer ? record.employer.trim() : '',
    yearsWithOrganization: parseInt(record.yearsWithOrganization || '0') || 0,
    categoryOfEngagement: 'general' // Default for CSV imports
  };
}

/**
 * Validate and clean a batch of records
 */
export function validateBatch(records) {
  console.log('🔍 VALIDATOR: Starting validation of', records.length, 'records');
  console.log('🔍 VALIDATOR: First record sample:', records[0]);
  
  const validRecords = [];
  const errors = [];
  
  records.forEach((record, index) => {
    const lineNumber = index + 2; // +2 for header + 0-index
    
    // Validate required fields
    const validationErrors = validateSupporterRecord(record, lineNumber);
    
    if (validationErrors.length > 0) {
      console.log('🔍 VALIDATOR: Record', lineNumber, 'has errors:', validationErrors);
      errors.push(...validationErrors);
    } else {
      // Clean and add to valid records
      const cleanedRecord = cleanSupporterData(record);
      console.log('🔍 VALIDATOR: Record', lineNumber, 'cleaned:', cleanedRecord);
      validRecords.push(cleanedRecord);
    }
  });
  
  console.log('🔍 VALIDATOR: Final results:', {
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
