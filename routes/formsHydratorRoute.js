import express from 'express';
import { getPrismaClient } from '../config/database.js';
import { parsePublicFormToClean } from '../services/publicFormParserService.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /forms/:slug - Get public form config for external users
 * No auth required - this is for public form rendering
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    console.log('🔍 Loading public form for slug:', slug);
    
    // Get PublicForm with all custom fields
    const publicForm = await prisma.publicForm.findUnique({
      where: { slug },
      include: {
        event: true,
        customFields: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });
    
    if (!publicForm) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    if (!publicForm.isActive) {
      return res.status(400).json({ error: 'Form is not active' });
    }
    
    // Convert to clean public form structure (combines standard + custom fields)
    const cleanForm = parsePublicFormToClean(publicForm);
    
    console.log('✅ Public form loaded:', cleanForm.title, 'with', cleanForm.fields.length, 'fields');
    
    res.json(cleanForm);
    
  } catch (error) {
    console.error('❌ Public form load error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /forms/:formId/edit - Get form for editing (admin only)
 * Returns full PublicForm + EventForm data for FormBuilder
 */
router.get('/:formId/edit', async (req, res) => {
  try {
    const { formId } = req.params;
    
    console.log('🔍 Loading form for edit:', formId);
    
    // formId could be either EventForm.id or PublicForm.id
    // Try EventForm first (most common case)
    let eventForm = await prisma.eventForm.findUnique({
      where: { id: formId },
      include: {
        publicForm: {
          include: {
            customFields: {
              orderBy: { displayOrder: 'asc' }
            },
            event: true
          }
        }
      }
    });
    
    // If not found, try PublicForm.id
    if (!eventForm) {
      const publicForm = await prisma.publicForm.findUnique({
        where: { id: formId },
        include: {
          customFields: {
            orderBy: { displayOrder: 'asc' }
          },
          event: true,
          eventForms: true // Get all EventForms linked to this PublicForm
        }
      });
      
      if (!publicForm) {
        return res.status(404).json({ error: 'Form not found' });
      }
      
      // Return PublicForm data with first EventForm (or empty if none)
      return res.json({
        publicForm,
        eventForm: publicForm.eventForms[0] || null
      });
    }
    
    console.log('✅ Form loaded for edit:', eventForm.internalName);
    
    // Return combined EventForm + PublicForm data
    res.json({
      eventForm,
      publicForm: eventForm.publicForm
    });
    
  } catch (error) {
    console.error('❌ Form edit load error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
