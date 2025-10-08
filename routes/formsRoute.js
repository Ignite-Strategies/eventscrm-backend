import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

// List all forms (optionally filtered by orgId or eventId)
router.get('/', async (req, res) => {
  try {
    const { orgId, eventId } = req.query;
    
    const where = {};
    if (orgId) where.orgId = orgId;
    if (eventId) where.eventId = eventId;
    
    const forms = await prisma.eventForm.findMany({
      where,
      include: {
        event: {
          select: { id: true, name: true, slug: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(forms);
  } catch (error) {
    console.error('❌ List forms error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get single form by ID
router.get('/:formId', async (req, res) => {
  try {
    const form = await prisma.eventForm.findUnique({
      where: { id: req.params.formId },
      include: {
        event: true,
        customFields: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    res.json(form);
  } catch (error) {
    console.error('❌ Get form error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create new form
router.post('/', async (req, res) => {
  try {
    const {
      orgId,
      eventId,
      audienceType,
      name,
      internalName, // NEW: Support both name and internalName
      slug,
      publicTitle,
      publicDescription,
      targetStage,
      fields,
      styling,
      isActive
    } = req.body;
    
    // Use internalName if provided, otherwise fallback to name
    const formName = internalName || name;
    
    console.log('📝 Creating form:', formName, 'for audience:', audienceType);
    
    // Validate required fields
    if (!orgId || !eventId || !audienceType || !formName || !slug || !targetStage) {
      return res.status(400).json({
        error: 'Missing required fields: orgId, eventId, audienceType, name/internalName, slug, targetStage'
      });
    }
    
    // Check if slug already exists
    const existing = await prisma.eventForm.findUnique({
      where: { slug }
    });
    
    if (existing) {
      return res.status(400).json({
        error: `Form with slug "${slug}" already exists. Please choose a different name.`
      });
    }
    
    // Verify event exists
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Create form
    const form = await prisma.eventForm.create({
      data: {
        orgId,
        eventId,
        audienceType,
        internalName: formName,
        slug,
        publicTitle: publicTitle || formName,
        publicDescription: publicDescription || '',
        targetStage,
        styling,
        collectName: true,
        collectEmail: true,
        collectPhone: true,
        isActive: isActive !== undefined ? isActive : true,
        submissionCount: 0
      },
      include: {
        event: true
      }
    });
    
    // Create CustomField records for custom fields
    if (fields && fields.length > 0) {
      // Check for duplicate labels within the form
      const labels = fields.map(f => f.label);
      const uniqueLabels = new Set(labels);
      if (labels.length !== uniqueLabels.size) {
        return res.status(400).json({
          error: 'Duplicate field labels found. Each field must have a unique label.'
        });
      }
      
      // Get adminId from request headers (set by frontend)
      const adminId = req.headers['x-admin-id'] || null;
      
      const customFields = fields.map((field, index) => ({
        eventFormId: form.id,
        eventId: form.eventId,
        adminId: adminId,
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
        data: customFields
      });
      
      console.log('✅ CustomFields created:', customFields.length, 'fields');
    }
    
    console.log('✅ Form created:', form.slug, 'audience:', form.audienceType);
    
    res.status(201).json(form);
  } catch (error) {
    console.error('❌ Create form error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update form (full replacement)
router.put('/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    const updates = req.body;
    
    console.log('📝 Updating form:', formId);
    
    // Don't allow changing orgId, eventId, or audienceType
    delete updates.orgId;
    delete updates.eventId;
    delete updates.audienceType;
    delete updates.submissionCount; // Only backend can update this
    delete updates.id; // Don't allow changing the ID
    
    // Handle custom fields if provided
    const { fields } = updates;
    delete updates.fields; // Remove from main update
    
    // Only update allowed fields
    const allowedUpdates = {
      internalName: updates.internalName,
      slug: updates.slug,
      publicTitle: updates.publicTitle,
      publicDescription: updates.publicDescription,
      targetStage: updates.targetStage,
      styling: updates.styling,
      collectName: updates.collectName,
      collectEmail: updates.collectEmail,
      collectPhone: updates.collectPhone,
      isActive: updates.isActive
    };
    
    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key] === undefined) {
        delete allowedUpdates[key];
      }
    });
    
    const form = await prisma.eventForm.update({
      where: { id: formId },
      data: allowedUpdates,
      include: {
        event: true
      }
    });
    
    // Update custom fields if provided
    if (fields && fields.length > 0) {
      // Check for duplicate labels within the form
      const labels = fields.map(f => f.label);
      const uniqueLabels = new Set(labels);
      if (labels.length !== uniqueLabels.size) {
        return res.status(400).json({
          error: 'Duplicate field labels found. Each field must have a unique label.'
        });
      }
      
      // Delete existing custom fields
      await prisma.customField.deleteMany({
        where: { eventFormId: formId }
      });
      
      // Get adminId from request headers (set by frontend)
      const adminId = req.headers['x-admin-id'] || null;
      
      const customFields = fields.map((field, index) => ({
        eventFormId: formId,
        eventId: form.eventId,
        adminId: adminId,
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
        data: customFields
      });
      
      console.log('✅ CustomFields updated:', customFields.length, 'fields');
    }
    
    console.log('✅ Form updated:', form.slug);
    
    res.json(form);
  } catch (error) {
    console.error('❌ Update form error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    res.status(400).json({ error: error.message });
  }
});

// Delete form
router.delete('/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    
    console.log('🗑️ Deleting form:', formId);
    
    await prisma.eventForm.delete({
      where: { id: formId }
    });
    
    console.log('✅ Form deleted');
    
    res.json({ success: true, message: 'Form deleted successfully' });
  } catch (error) {
    console.error('❌ Delete form error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    res.status(400).json({ error: error.message });
  }
});

// Get form submissions (via EventAttendees)
router.get('/:formId/submissions', async (req, res) => {
  try {
    const { formId } = req.params;
    
    const submissions = await prisma.eventAttendee.findMany({
      where: { submittedFormId: formId },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(submissions);
  } catch (error) {
    console.error('❌ Get submissions error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

