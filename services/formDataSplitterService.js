/**
 * Form Data Splitter Service
 * Splits incoming form creation/update data into PublicForm and EventForm
 */

/**
 * Split form data into PublicForm and EventForm parts
 * @param {Object} formData - Raw form data from frontend
 * @returns {Object} - { publicFormData, eventFormData }
 */
export function splitFormData(formData) {
  // PUBLIC FORM - External-facing data
  const publicFormData = {
    orgId: formData.orgId,
    eventId: formData.eventId,
    slug: formData.slug,
    title: formData.publicTitle || formData.title || formData.name, // Flexible
    description: formData.publicDescription || formData.description,
    collectFirstName: formData.collectFirstName !== undefined ? formData.collectFirstName : true,
    collectLastName: formData.collectLastName !== undefined ? formData.collectLastName : true,
    collectEmail: formData.collectEmail !== undefined ? formData.collectEmail : true,
    collectPhone: formData.collectPhone !== undefined ? formData.collectPhone : true,
    audienceType: formData.audienceType,
    targetStage: formData.targetStage,
    isActive: formData.isActive !== undefined ? formData.isActive : true,
  };

  // EVENT FORM - Internal CRM tracking
  const eventFormData = {
    orgId: formData.orgId,
    eventId: formData.eventId,
    internalName: formData.internalName || formData.name || formData.title, // Flexible
    internalPurpose: formData.internalPurpose || formData.purpose,
    styling: formData.styling || null,
  };

  return { publicFormData, eventFormData };
}

/**
 * Split update data (only updates provided fields)
 * @param {Object} updateData - Partial form data from frontend
 * @returns {Object} - { publicFormUpdates, eventFormUpdates }
 */
export function splitFormUpdates(updateData) {
  const publicFormUpdates = {};
  const eventFormUpdates = {};

  // Public form fields
  if (updateData.slug !== undefined) publicFormUpdates.slug = updateData.slug;
  if (updateData.publicTitle !== undefined) publicFormUpdates.title = updateData.publicTitle;
  if (updateData.title !== undefined && !updateData.publicTitle) publicFormUpdates.title = updateData.title;
  if (updateData.publicDescription !== undefined) publicFormUpdates.description = updateData.publicDescription;
  if (updateData.description !== undefined && !updateData.publicDescription) publicFormUpdates.description = updateData.description;
  if (updateData.collectName !== undefined) publicFormUpdates.collectName = updateData.collectName;
  if (updateData.collectEmail !== undefined) publicFormUpdates.collectEmail = updateData.collectEmail;
  if (updateData.collectPhone !== undefined) publicFormUpdates.collectPhone = updateData.collectPhone;
  if (updateData.audienceType !== undefined) publicFormUpdates.audienceType = updateData.audienceType;
  if (updateData.targetStage !== undefined) publicFormUpdates.targetStage = updateData.targetStage;
  if (updateData.isActive !== undefined) publicFormUpdates.isActive = updateData.isActive;

  // Event form fields
  if (updateData.internalName !== undefined) eventFormUpdates.internalName = updateData.internalName;
  if (updateData.name !== undefined && !updateData.internalName) eventFormUpdates.internalName = updateData.name;
  if (updateData.internalPurpose !== undefined) eventFormUpdates.internalPurpose = updateData.internalPurpose;
  if (updateData.styling !== undefined) eventFormUpdates.styling = updateData.styling;

  return { publicFormUpdates, eventFormUpdates };
}

/**
 * Validate required fields for form creation
 * @param {Object} publicFormData - Public form data
 * @param {Object} eventFormData - Event form data
 * @returns {Object} - { isValid: boolean, errors: [] }
 */
export function validateFormData(publicFormData, eventFormData) {
  const errors = [];

  // Public form required fields
  if (!publicFormData.orgId) errors.push('orgId is required');
  if (!publicFormData.eventId) errors.push('eventId is required');
  if (!publicFormData.slug) errors.push('slug is required');
  if (!publicFormData.title) errors.push('title is required');
  if (!publicFormData.audienceType) errors.push('audienceType is required');
  if (!publicFormData.targetStage) errors.push('targetStage is required');

  // Event form required fields
  if (!eventFormData.internalName) errors.push('internalName is required');

  return {
    isValid: errors.length === 0,
    errors
  };
}

export default {
  splitFormData,
  splitFormUpdates,
  validateFormData
};

