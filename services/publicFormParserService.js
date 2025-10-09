/**
 * Public Form Parser Service
 * Converts internal EventForm to clean public form for submission
 */

/**
 * Parse PublicForm into clean structure for external rendering
 * @param {Object} publicForm - Full PublicForm with fields JSON
 * @returns {Object} - Clean public form structure
 */
export function parsePublicFormToClean(publicForm) {
  if (!publicForm) return null;

  // Build the clean public form - just return what's in the database!
  const cleanForm = {
    id: publicForm.id,
    slug: publicForm.slug,
    title: publicForm.title,
    description: publicForm.description,
    targetStage: publicForm.targetStage,
    audienceType: publicForm.audienceType,
    fields: publicForm.fields || [] // Just return the fields JSON as-is from database
  };

  // Sort fields by order
  cleanForm.fields.sort((a, b) => (a.order || 0) - (b.order || 0));

  return cleanForm;
}

/**
 * Validate form submission against public form structure
 * @param {Object} publicForm - Public form structure
 * @param {Object} submissionData - User submission data
 * @returns {Object} - { isValid: boolean, errors: [] }
 */
export function validateSubmission(publicForm, submissionData) {
  const errors = [];

  if (!publicForm) {
    return { isValid: false, errors: ['Form not found'] };
  }

  // Check required fields
  publicForm.fields.forEach(field => {
    if (field.required) {
      const value = submissionData[field.id];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push(`${field.label} is required`);
      }
    }
  });

  // Validate email format
  if (submissionData.email && !isValidEmail(submissionData.email)) {
    errors.push('Please enter a valid email address');
  }

  // Validate phone format (basic)
  if (submissionData.phone && !isValidPhone(submissionData.phone)) {
    errors.push('Please enter a valid phone number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extract contact data from submission
 * @param {Object} submissionData - User submission data
 * @returns {Object} - Clean contact data
 */
export function extractContactData(submissionData) {
  return {
    firstName: parseFirstName(submissionData.name),
    lastName: parseLastName(submissionData.name),
    email: submissionData.email?.toLowerCase().trim(),
    phone: submissionData.phone?.trim()
  };
}

/**
 * Extract custom field data from submission
 * @param {Object} submissionData - User submission data
 * @param {Object} publicForm - Public form structure
 * @returns {Object} - Custom field data
 */
export function extractCustomFieldData(submissionData, publicForm) {
  const customData = {};
  
  if (!publicForm.fields) return customData;

  publicForm.fields.forEach(field => {
    // Skip standard fields
    if (['name', 'email', 'phone'].includes(field.id)) return;
    
    const value = submissionData[field.id];
    if (value !== undefined) {
      customData[field.label] = value;
    }
  });

  return customData;
}

// Helper functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  // Basic phone validation - just check it has digits
  const phoneRegex = /\d/;
  return phoneRegex.test(phone);
}

function parseFirstName(fullName) {
  if (!fullName) return '';
  return fullName.trim().split(' ')[0];
}

function parseLastName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  return parts.slice(1).join(' ') || '';
}

export default {
  parsePublicFormToClean,
  validateSubmission,
  extractContactData,
  extractCustomFieldData
};
