import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * GET /forms/public/:slug - Get public form for external display
 * No auth required - this is for public form rendering
 * JUST RETURNS WHAT'S IN THE DATABASE - NO PARSING, NO SERVICES
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    console.log('🔍 Loading public form for slug:', slug);
    
    // Get PublicForm from database
    const publicForm = await prisma.publicForm.findUnique({
      where: { slug }
    });
    
    if (!publicForm) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    if (!publicForm.isActive) {
      return res.status(400).json({ error: 'Form is not active' });
    }
    
    console.log('✅ Public form loaded:', publicForm.title);
    console.log('📋 Fields:', publicForm.fields);
    
    // JUST RETURN WHAT'S IN THE DATABASE - THAT'S IT!
    res.json({
      id: publicForm.id,
      slug: publicForm.slug,
      title: publicForm.title,
      description: publicForm.description,
      fields: publicForm.fields || [], // Return fields JSON as-is
      eventId: publicForm.eventId,
      audienceType: publicForm.audienceType,
      targetStage: publicForm.targetStage
    });
    
  } catch (error) {
    console.error('❌ Public form load error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

