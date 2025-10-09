import express from 'express';
import { getPrismaClient } from '../config/database.js';
import { parsePublicFormToClean } from '../services/publicFormParserService.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /forms (with query params) - List forms for an org
 * Used by admin dashboard
 */
router.get('/', async (req, res) => {
  try {
    const { orgId } = req.query;
    
    if (!orgId) {
      return res.status(400).json({ error: 'orgId is required' });
    }
    
    console.log('📋 Listing forms for org:', orgId);
    
    // Get all PublicForms with their EventForms
    const publicForms = await prisma.publicForm.findMany({
      where: { orgId },
      include: {
        event: true,
        eventForms: true,
        customFields: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Map to a clean structure for the frontend
    const formsList = publicForms.map(pf => {
      const eventForm = pf.eventForms[0]; // Get first EventForm (should only be one)
      return {
        id: eventForm?.id || pf.id, // Use EventForm ID if exists, otherwise PublicForm ID
        publicFormId: pf.id,
        slug: pf.slug,
        name: eventForm?.internalName || pf.title,
        publicTitle: pf.title,
        audienceType: pf.audienceType,
        targetStage: pf.targetStage,
        isActive: pf.isActive,
        submissionCount: pf.submissionCount,
        customFieldsCount: pf.customFields.length,
        event: pf.event,
        createdAt: pf.createdAt,
        updatedAt: pf.updatedAt
      };
    });
    
    console.log('✅ Found', formsList.length, 'forms');
    
    res.json(formsList);
    
  } catch (error) {
    console.error('❌ Forms list error:', error);
    res.status(400).json({ error: error.message });
  }
});

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
      
      // Add standard fields to publicForm.customFields for frontend
      const allFields = [];
      
      // Add standard fields based on flags
      if (publicForm.collectName) {
        allFields.push({
          id: 'name',
          fieldType: 'text',
          label: 'Full Name',
          placeholder: 'Enter your full name',
          isRequired: true,
          displayOrder: 1
        });
      }
      
      if (publicForm.collectEmail) {
        allFields.push({
          id: 'email',
          fieldType: 'email',
          label: 'Email Address',
          placeholder: 'email@example.com',
          isRequired: true,
          displayOrder: 2
        });
      }
      
      if (publicForm.collectPhone) {
        allFields.push({
          id: 'phone',
          fieldType: 'tel',
          label: 'Phone Number',
          placeholder: '(555) 555-5555',
          isRequired: true,
          displayOrder: 3
        });
      }
      
      // Add custom fields
      allFields.push(...publicForm.customFields);
      
      // Return PublicForm data with first EventForm (or empty if none)
      return res.json({
        publicForm: {
          ...publicForm,
          customFields: allFields // Contains both standard + custom
        },
        eventForm: publicForm.eventForms[0] || null
      });
    }
    
    console.log('✅ Form loaded for edit:', eventForm.internalName);
    
    // Add standard fields to publicForm.customFields for frontend
    const publicForm = eventForm.publicForm;
    const allFields = [];
    
    // Add standard fields based on flags
    if (publicForm.collectName) {
      allFields.push({
        id: 'name',
        fieldType: 'text',
        label: 'Full Name',
        placeholder: 'Enter your full name',
        isRequired: true,
        displayOrder: 1
      });
    }
    
    if (publicForm.collectEmail) {
      allFields.push({
        id: 'email',
        fieldType: 'email',
        label: 'Email Address',
        placeholder: 'email@example.com',
        isRequired: true,
        displayOrder: 2
      });
    }
    
    if (publicForm.collectPhone) {
      allFields.push({
        id: 'phone',
        fieldType: 'tel',
        label: 'Phone Number',
        placeholder: '(555) 555-5555',
        isRequired: true,
        displayOrder: 3
      });
    }
    
    // Add custom fields
    allFields.push(...publicForm.customFields);
    
    // Return combined EventForm + PublicForm data with all fields
    res.json({
      eventForm,
      publicForm: {
        ...publicForm,
        customFields: allFields // Contains both standard + custom
      }
    });
    
  } catch (error) {
    console.error('❌ Form edit load error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
