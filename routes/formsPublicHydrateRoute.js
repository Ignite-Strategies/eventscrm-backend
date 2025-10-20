import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /forms/public/event/:eventId - Get public form for external display
 * No auth required - this is for public form rendering
 * JUST RETURNS WHAT'S IN THE DATABASE - NO PARSING, NO SERVICES
 */
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    console.log('🔍 Loading public form for eventId:', eventId);
    
    // Get PublicForm by eventId - more reliable than slug!
    const publicForm = await prisma.publicForm.findFirst({
      where: { eventId }
    });
    
    if (!publicForm) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    if (!publicForm.isActive) {
      return res.status(400).json({ error: 'Form is not active' });
    }
    
    // Add standard fields + custom fields
    const standardFields = [
      { id: 'firstName', type: 'text', label: 'First Name', required: true, order: 1, placeholder: 'Enter first name' },
      { id: 'lastName', type: 'text', label: 'Last Name', required: true, order: 2, placeholder: 'Enter last name' },
      { id: 'email', type: 'email', label: 'Email Address', required: true, order: 3, placeholder: 'email@example.com' },
      { id: 'phone', type: 'tel', label: 'Phone Number', required: publicForm.collectPhone || true, order: 4, placeholder: '(555) 555-5555' }
    ];
    
    const customFields = publicForm.fields || [];
    const allFields = [...standardFields, ...customFields];
    
    console.log('✅ Public form loaded:', publicForm.title);
    console.log('📋 Standard fields:', standardFields.length);
    console.log('📋 Custom fields:', customFields.length);
    
    res.json({
      id: publicForm.id,
      slug: publicForm.slug,
      title: publicForm.title,
      description: publicForm.description,
      fields: allFields, // Standard + Custom
      containerId: publicForm.containerId,   // ← From PublicForm (tenant isolation)
      orgId: publicForm.orgId,               // ← From PublicForm
      eventId: publicForm.eventId,           // ← From PublicForm
      audienceType: publicForm.audienceType, // ← From PublicForm
      targetStage: publicForm.targetStage    // ← From PublicForm (maps to currentStage)
    });
    
  } catch (error) {
    console.error('❌ Public form load error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

