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
        event: true
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
      slug,
      publicTitle,
      publicDescription,
      targetStage,
      fields,
      styling,
      isActive
    } = req.body;
    
    console.log('📝 Creating form:', name, 'for audience:', audienceType);
    
    // Validate required fields
    if (!orgId || !eventId || !audienceType || !name || !slug || !targetStage) {
      return res.status(400).json({
        error: 'Missing required fields: orgId, eventId, audienceType, name, slug, targetStage'
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
        name,
        slug,
        publicTitle: publicTitle || name,
        publicDescription: publicDescription || '',
        targetStage,
        fields,
        styling,
        isActive: isActive !== undefined ? isActive : true,
        submissionCount: 0
      },
      include: {
        event: true
      }
    });
    
    console.log('✅ Form created:', form.slug, 'audience:', form.audienceType);
    
    res.status(201).json(form);
  } catch (error) {
    console.error('❌ Create form error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update form
router.patch('/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    const updates = req.body;
    
    console.log('📝 Updating form:', formId);
    
    // Don't allow changing orgId, eventId, or audienceType
    delete updates.orgId;
    delete updates.eventId;
    delete updates.audienceType;
    delete updates.submissionCount; // Only backend can update this
    
    const form = await prisma.eventForm.update({
      where: { id: formId },
      data: updates,
      include: {
        event: true
      }
    });
    
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

