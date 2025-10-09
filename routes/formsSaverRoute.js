import express from 'express';
import { getPrismaClient } from '../config/database.js';
import { splitFormData, splitFormUpdates, validateFormData } from '../services/formDataSplitterService.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * POST /forms - Create new form (PublicForm + EventForm + CustomFields)
 */
router.post('/', async (req, res) => {
  try {
    console.log('📝 Creating new form with split architecture');
    
    // Split incoming data into PublicForm and EventForm parts
    const { publicFormData, eventFormData } = splitFormData(req.body);
    
    // Validate required fields
    const validation = validateFormData(publicFormData, eventFormData);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors.join(', ') });
    }
    
    // Check if slug already exists
    const existing = await prisma.publicForm.findUnique({
      where: { slug: publicFormData.slug }
    });
    
    if (existing) {
      return res.status(400).json({
        error: `Form with slug "${publicFormData.slug}" already exists. Please choose a different name.`
      });
    }
    
    // Verify event exists
    const event = await prisma.event.findUnique({ 
      where: { id: publicFormData.eventId } 
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Create PublicForm
    const publicForm = await prisma.publicForm.create({
      data: publicFormData,
      include: {
        event: true
      }
    });
    
    console.log('✅ PublicForm created:', publicForm.slug);
    
    // Create EventForm (linked to PublicForm)
    const eventForm = await prisma.eventForm.create({
      data: {
        ...eventFormData,
        publicFormId: publicForm.id
      }
    });
    
    console.log('✅ EventForm created:', eventForm.internalName);
    
    // Create CustomField records (linked to PublicForm)
    const customFields = req.body.fields || [];
    if (customFields.length > 0) {
      const adminId = req.headers['x-admin-id'] || null;
      
      const dbCustomFields = customFields.map((field, index) => ({
        publicFormId: publicForm.id,
        eventId: publicForm.eventId,
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
      
      await prisma.customField.createMany({
        data: dbCustomFields
      });
      
      console.log('✅ CustomFields created:', customFields.length, 'fields');
    }
    
    // Return combined data
    res.json({
      publicForm,
      eventForm,
      customFieldsCount: customFields.length
    });
    
  } catch (error) {
    console.error('❌ Form creation error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /forms/:formId - Update existing form
 * formId can be either EventForm.id or PublicForm.id
 */
router.patch('/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    console.log('📝 Updating form:', formId);
    
    // Split update data
    const { publicFormUpdates, eventFormUpdates } = splitFormUpdates(req.body);
    
    // Try to find EventForm first
    let eventForm = await prisma.eventForm.findUnique({
      where: { id: formId },
      include: { publicForm: true }
    });
    
    let publicForm;
    
    if (eventForm) {
      // formId is EventForm.id
      publicForm = eventForm.publicForm;
    } else {
      // Try PublicForm.id
      publicForm = await prisma.publicForm.findUnique({
        where: { id: formId },
        include: { eventForms: true }
      });
      
      if (!publicForm) {
        return res.status(404).json({ error: 'Form not found' });
      }
      
      eventForm = publicForm.eventForms[0] || null;
    }
    
    // Update PublicForm if there are updates
    if (Object.keys(publicFormUpdates).length > 0) {
      publicForm = await prisma.publicForm.update({
        where: { id: publicForm.id },
        data: publicFormUpdates
      });
      console.log('✅ PublicForm updated');
    }
    
    // Update EventForm if there are updates and EventForm exists
    if (eventForm && Object.keys(eventFormUpdates).length > 0) {
      eventForm = await prisma.eventForm.update({
        where: { id: eventForm.id },
        data: eventFormUpdates
      });
      console.log('✅ EventForm updated');
    }
    
    // Update custom fields if provided
    if (req.body.fields) {
      const customFields = req.body.fields;
      
      // Delete existing custom fields for this PublicForm
      await prisma.customField.deleteMany({
        where: { publicFormId: publicForm.id }
      });
      
      // Create new custom fields
      if (customFields.length > 0) {
        const adminId = req.headers['x-admin-id'] || null;
        
        const dbCustomFields = customFields.map((field, index) => ({
          publicFormId: publicForm.id,
          eventId: publicForm.eventId,
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
        
        await prisma.customField.createMany({
          data: dbCustomFields
        });
        
        console.log('✅ CustomFields updated:', customFields.length, 'fields');
      }
    }
    
    res.json({
      publicForm,
      eventForm,
      success: true
    });
    
  } catch (error) {
    console.error('❌ Form update error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /forms/:formId - Delete form
 * Deletes PublicForm (EventForm + CustomFields cascade)
 */
router.delete('/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    console.log('🗑️ Deleting form:', formId);
    
    // Try to find EventForm first
    let eventForm = await prisma.eventForm.findUnique({
      where: { id: formId },
      include: { publicForm: true }
    });
    
    let publicFormId;
    
    if (eventForm) {
      // formId is EventForm.id - get the publicFormId
      publicFormId = eventForm.publicFormId;
      
      // Delete EventForm first
      await prisma.eventForm.delete({
        where: { id: formId }
      });
      console.log('✅ EventForm deleted');
    } else {
      // formId is PublicForm.id
      publicFormId = formId;
    }
    
    // Delete PublicForm (this cascades to CustomFields and remaining EventForms)
    await prisma.publicForm.delete({
      where: { id: publicFormId }
    });
    
    console.log('✅ PublicForm and all related data deleted');
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Form deletion error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
