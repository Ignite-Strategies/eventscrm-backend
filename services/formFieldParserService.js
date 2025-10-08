/**
 * Form Field Parser Service
 * Handles the distinction between standard fields and custom fields
 */

// Standard field definitions that every form has
const STANDARD_FIELDS = {
  name: {
    id: 'name',
    label: 'Full Name',
    type: 'text',
    required: true,
    placeholder: 'Enter your full name'
  },
  email: {
    id: 'email', 
    label: 'Email Address',
    type: 'email',
    required: true,
    placeholder: 'email@example.com'
  },
  phone: {
    id: 'phone',
    label: 'Phone Number', 
    type: 'tel',
    required: true,
    placeholder: '(555) 555-5555'
  }
};

// Standard field labels that should never be treated as custom fields
const STANDARD_FIELD_LABELS = [
  'Full Name',
  'Email Address', 
  'Phone Number',
  'Email',
  'Phone',
  'Name'
];

// Standard field IDs that should never be treated as custom fields
const STANDARD_FIELD_IDS = ['name', 'email', 'phone'];

/**
 * Parse form fields and separate standard vs custom fields
 * @param {Array} fields - Raw fields from frontend
 * @returns {Object} - { standardFields: [], customFields: [] }
 */
export function parseFormFields(fields) {
  if (!fields || !Array.isArray(fields)) {
    return { standardFields: [], customFields: [] };
  }

  const standardFields = [];
  const customFields = [];

  fields.forEach(field => {
    const isStandardField = isStandardField(field);
    
    if (isStandardField) {
      standardFields.push(field);
    } else {
      customFields.push(field);
    }
  });

  return { standardFields, customFields };
}

/**
 * Check if a field is a standard field
 * @param {Object} field - Field object
 * @returns {boolean} - True if standard field
 */
export function isStandardField(field) {
  if (!field) return false;

  // Check by label
  if (STANDARD_FIELD_LABELS.includes(field.label)) {
    return true;
  }

  // Check by ID
  if (STANDARD_FIELD_IDS.includes(field.id)) {
    return true;
  }

  // Check by temporary field ID pattern
  if (field.id && field.id.startsWith('field_')) {
    return false; // Temporary IDs are custom fields
  }

  return false;
}

/**
 * Get standard field configuration for EventForm
 * @param {Array} standardFields - Standard fields array
 * @returns {Object} - EventForm field flags
 */
export function getStandardFieldConfig(standardFields) {
  const config = {
    collectName: false,
    collectEmail: false, 
    collectPhone: false
  };

  standardFields.forEach(field => {
    if (field.id === 'name' || field.label === 'Full Name') {
      config.collectName = true;
    } else if (field.id === 'email' || field.label === 'Email Address') {
      config.collectEmail = true;
    } else if (field.id === 'phone' || field.label === 'Phone Number') {
      config.collectPhone = true;
    }
  });

  return config;
}

/**
 * Get default standard fields for new forms
 * @returns {Array} - Default standard fields
 */
export function getDefaultStandardFields() {
  return Object.values(STANDARD_FIELDS);
}

/**
 * Validate custom fields
 * @param {Array} customFields - Custom fields array
 * @returns {Object} - { isValid: boolean, error?: string }
 */
export function validateCustomFields(customFields) {
  if (!customFields || customFields.length === 0) {
    return { isValid: true };
  }

  // Check for duplicate labels
  const labels = customFields.map(f => f.label);
  const uniqueLabels = new Set(labels);
  
  if (labels.length !== uniqueLabels.size) {
    return {
      isValid: false,
      error: 'Duplicate field labels found. Each field must have a unique label.'
    };
  }

  // Check for empty labels
  const emptyLabels = customFields.filter(f => !f.label || f.label.trim() === '');
  if (emptyLabels.length > 0) {
    return {
      isValid: false,
      error: 'All fields must have a label.'
    };
  }

  return { isValid: true };
}

/**
 * Format custom fields for database insertion
 * @param {Array} customFields - Custom fields array
 * @param {string} publicFormId - PublicForm ID (NOT EventForm!)
 * @param {string} eventId - Event ID  
 * @param {string} adminId - Admin ID
 * @returns {Array} - Formatted fields for Prisma
 */
export function formatCustomFieldsForDB(customFields, publicFormId, eventId, adminId) {
  return customFields.map((field, index) => ({
    publicFormId,  // Link to PublicForm, not EventForm!
    eventId,
    adminId,
    fieldType: field.type,
    label: field.label,
    placeholder: field.placeholder || null,
    helpText: field.helpText || null,
    isRequired: field.required || false,
    minLength: field.minLength || null,
    maxLength: field.maxLength || null,
    minValue: field.min || null,
    maxValue: field.max || null,
    options: field.options ? JSON.stringify(field.options) : null,
    displayOrder: field.order || index,
    isActive: true
  }));
}

export default {
  parseFormFields,
  isStandardField,
  getStandardFieldConfig,
  getDefaultStandardFields,
  validateCustomFields,
  formatCustomFieldsForDB
};
