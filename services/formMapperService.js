/**
 * Form Mapper Service
 * 
 * THE ONE SERVICE that handles everything:
 * - Maps form fields to database columns
 * - Creates unique contactId for Contact-First Architecture
 * - Handles tenant isolation with containerId
 * - Creates/updates contacts directly
 */

/**
 * Field mapping configuration
 * Maps form field names to database column names
 */
const FIELD_MAPPINGS = {
  // Contact fields
  contact: {
    'firstName': 'firstName',
    'first_name': 'firstName',
    'fname': 'firstName',
    'lastName': 'lastName', 
    'last_name': 'lastName',
    'lname': 'lastName',
    'email': 'email',
    'email_address': 'email',
    'phone': 'phone',
    'phone_number': 'phone',
    'goesBy': 'goesBy',
    'f3_name': 'goesBy',
    'f3Name': 'goesBy',
    'nickname': 'goesBy',
    'goes_by': 'goesBy',
    'display_name': 'goesBy',
    'preferred_name': 'goesBy'
  },
  
  // EventAttendee fields
  eventAttendee: {
    'spouseOrOther': 'spouseOrOther',
    'bringing_m': 'spouseOrOther',
    'will_bring_spouse': 'spouseOrOther',
    'bringing_spouse': 'spouseOrOther',
    'will_you_bring_your_m_or_anyone_else': 'spouseOrOther',
    
    'howManyInParty': 'howManyInParty',
    'how_many_in_party': 'howManyInParty',
    'if_going_how_many_in_your_party': 'howManyInParty',
    'party_size': 'howManyInParty',
    'partySize': 'howManyInParty',
    
    'likelihoodToAttendId': 'likelihoodToAttendId',
    'how_likely_are_you_to_attend': 'likelihoodToAttendId',
    'likelihood_to_attend': 'likelihoodToAttendId',
    'attendance_likelihood': 'likelihoodToAttendId',
    'likelihood': 'likelihoodToAttendId'
  }
};

/**
 * Value transformation rules
 */
const VALUE_TRANSFORMATIONS = {
  spouseOrOther: {
    'yes': 'spouse',
    'no': 'solo',
    'solo': 'solo',
    'spouse': 'spouse',
    'other': 'other'
  },
  
  likelihoodToAttend: {
    'i\'m_in_—_planning_to_be_there!': 1,
    'i\'m in — planning to be there!': 1,
    'very_likely': 1,
    'probably': 2,
    'likely': 2,
    'maybe': 3,
    'support_from_afar': 4,
    'support from afar': 4
  }
};

/**
 * Extract and map form data to structured fields
 * @param {Object} formData - Raw form submission data
 * @returns {Object} Mapped data for Contact and EventAttendee
 */
function mapFormFields(formData) {
  console.log('🗺️ Field Mapping Service: Processing form data');
  
  const result = {
    contact: {},
    eventAttendee: {},
    customFields: {}
  };
  
  // Process each form field
  Object.keys(formData).forEach(fieldName => {
    const value = formData[fieldName];
    
    // Check Contact field mappings
    if (FIELD_MAPPINGS.contact[fieldName]) {
      const dbField = FIELD_MAPPINGS.contact[fieldName];
      result.contact[dbField] = transformValue(value, dbField);
      console.log(`📋 Mapped Contact: ${fieldName} → ${dbField} = ${result.contact[dbField]}`);
      return;
    }
    
    // Check EventAttendee field mappings
    if (FIELD_MAPPINGS.eventAttendee[fieldName]) {
      const dbField = FIELD_MAPPINGS.eventAttendee[fieldName];
      result.eventAttendee[dbField] = transformValue(value, dbField);
      console.log(`📋 Mapped EventAttendee: ${fieldName} → ${dbField} = ${result.eventAttendee[dbField]}`);
      return;
    }
    
    // If no mapping found, store as custom field
    result.customFields[fieldName] = value;
    console.log(`📋 Custom field: ${fieldName} = ${value}`);
  });
  
  // Apply special transformations
  result.eventAttendee = applySpecialTransformations(result.eventAttendee, formData);
  
  console.log('✅ Field mapping complete:', result);
  return result;
}

/**
 * Transform field values based on type and transformation rules
 * @param {any} value - Raw field value
 * @param {string} fieldName - Database field name
 * @returns {any} Transformed value
 */
function transformValue(value, fieldName) {
  if (!value || value === '') return null;
  
  // Apply specific transformations
  if (fieldName === 'spouseOrOther' && VALUE_TRANSFORMATIONS.spouseOrOther[value]) {
    return VALUE_TRANSFORMATIONS.spouseOrOther[value];
  }
  
  if (fieldName === 'likelihoodToAttendId' && VALUE_TRANSFORMATIONS.likelihoodToAttend[value]) {
    return VALUE_TRANSFORMATIONS.likelihoodToAttend[value];
  }
  
  // Convert string numbers to integers
  if (fieldName === 'howManyInParty' && typeof value === 'string' && /^\d+$/.test(value)) {
    return parseInt(value);
  }
  
  // Trim strings
  if (typeof value === 'string') {
    return value.trim();
  }
  
  return value;
}

/**
 * Apply special transformations that depend on multiple fields
 * @param {Object} eventAttendee - EventAttendee data
 * @param {Object} originalFormData - Original form data
 * @returns {Object} Transformed EventAttendee data
 */
function applySpecialTransformations(eventAttendee, originalFormData) {
  // If spouseOrOther is not set but we have bringing info, infer it
  if (!eventAttendee.spouseOrOther) {
    const bringingResponse = originalFormData['will_you_bring_your_m_or_anyone_else'] || 
                            originalFormData['bringing_m'] || 
                            originalFormData['bringing_spouse'];
    
    if (bringingResponse) {
      eventAttendee.spouseOrOther = bringingResponse.toLowerCase().includes('yes') ? 'spouse' : 'solo';
      console.log(`🔄 Inferred spouseOrOther: ${bringingResponse} → ${eventAttendee.spouseOrOther}`);
    }
  }
  
  // If howManyInParty is not set but we have spouse info, infer it
  if (!eventAttendee.howManyInParty && eventAttendee.spouseOrOther) {
    eventAttendee.howManyInParty = eventAttendee.spouseOrOther === 'spouse' ? 2 : 1;
    console.log(`🔄 Inferred howManyInParty: ${eventAttendee.spouseOrOther} → ${eventAttendee.howManyInParty}`);
  }
  
  return eventAttendee;
}

/**
 * Get all mapped field names for a specific model
 * @param {string} model - 'contact' or 'eventAttendee'
 * @returns {Array} Array of database field names
 */
function getMappedFields(model) {
  return Object.values(FIELD_MAPPINGS[model] || {});
}

/**
 * Create or update contact with Contact-First Architecture
 * @param {Object} mappedData - Mapped form data
 * @param {Object} context - Context data (containerId, orgId, eventId, etc.)
 * @param {Object} prisma - Prisma client
 * @returns {Object} Created/updated contact
 */
async function createOrUpdateContact(mappedData, context, prisma) {
  const { customAlphabet } = await import('nanoid');
  const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);
  
  const {
    containerId,
    orgId,
    eventId,
    audienceType,
    currentStage,
    submittedFormId
  } = context;
  
  const { contact, eventAttendee } = mappedData;
  
  // Generate unique contactId for Contact-First Architecture
  const contactId = `contact_${nanoid()}`;
  
  // Extract personhood data
  const {
    firstName = '',
    lastName = '',
    email = '',
    phone = '',
    goesBy = ''
  } = contact;
  
  if (!email) {
    throw new Error('Email is required for contact creation');
  }
  
  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if contact exists in this container (tenant isolation!)
  const existingContact = await prisma.contact.findFirst({
    where: {
      email: normalizedEmail,
      containerId: containerId
    }
  });
  
  if (existingContact) {
    // UPDATE existing contact in this container
    console.log('🔄 Updating existing contact:', existingContact.id);
    
    const updatedContact = await prisma.contact.update({
      where: { id: existingContact.id },
      data: {
        // Update personhood if provided
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(goesBy && { goesBy }),
        
        // Update relationships
        orgId,
        eventId,
        spouseOrOther: eventAttendee.spouseOrOther || 'solo',
        howManyInParty: eventAttendee.howManyInParty || 1,
        
        // Update pipeline tracking
        audienceType,
        currentStage,
        
        // Form tracking
        submittedFormId
      }
    });
    
    return updatedContact;
    
  } else {
    // CREATE new contact with unique contactId
    console.log('🆕 Creating new contact with ID:', contactId);
    
    const newContact = await prisma.contact.create({
      data: {
        // Contact-First Architecture: Unique contactId
        id: contactId,
        
        // Personhood
        firstName,
        lastName,
        email: normalizedEmail,
        phone,
        goesBy,
        
        // Tenant isolation
        containerId,
        
        // Relationships
        orgId,
        eventId,
        
        // Event-specific data
        spouseOrOther: eventAttendee.spouseOrOther || 'solo',
        howManyInParty: eventAttendee.howManyInParty || 1,
        
        // Pipeline tracking
        audienceType,
        currentStage,
        
        // Form tracking
        submittedFormId
      }
    });
    
    return newContact;
  }
}

export {
  mapFormFields,
  createOrUpdateContact,
  getMappedFields,
  FIELD_MAPPINGS,
  VALUE_TRANSFORMATIONS
};
