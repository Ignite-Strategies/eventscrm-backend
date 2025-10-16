import express from 'express';
import { getPrismaClient } from '../config/database.js';
import { mapFormFields } from '../services/fieldMappingService.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * POST /forms/submit
 * 
 * Form submission → Creates/Updates Contact directly
 * No more Contact → OrgMember → EventAttendee chain!
 */
router.post('/submit', async (req, res) => {
  try {
    const { slug, orgId, eventId, pipelineId, audienceType, targetStage, formData } = req.body;
    
    console.log('📝 Form submission received for:', slug);
    console.log('📋 Submission data:', formData);
    
    // Get the PublicForm
    const publicForm = await prisma.publicForm.findUnique({
      where: { slug },
      include: { event: true }
    });
    
    if (!publicForm) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    if (!publicForm.isActive) {
      return res.status(400).json({ error: 'Form is not active' });
    }
    
    // Use the field mapping service
    const mappedData = mapFormFields(formData);
    
    // Extract contact data
    const firstName = mappedData.contact.firstName || '';
    const lastName = mappedData.contact.lastName || '';
    const email = mappedData.contact.email?.toLowerCase().trim();
    const phone = mappedData.contact.phone?.trim();
    const goesBy = mappedData.contact.goesBy;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Extract form-specific data
    const spouseOrOther = mappedData.eventAttendee.spouseOrOther || 'solo';
    const howManyInParty = mappedData.eventAttendee.howManyInParty || (spouseOrOther === 'spouse' ? 2 : 1);
    
    // Map stage names (backward compatibility)
    let mappedStage = targetStage;
    if (targetStage === 'soft_commit' || targetStage === 'rsvp') {
      mappedStage = 'rsvped';
    }
    
    // 🔥 CREATE/UPDATE CONTACT DIRECTLY - NO JUNCTION TABLES!
    const contact = await prisma.contact.upsert({
      where: { email },
      update: {
        // Update personhood if provided
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(goesBy && { goesBy }),
        
        // Update org relationship
        ...(orgId && { orgId }),
        ...(audienceType === 'org_members' && { isOrgMember: true }),
        
        // Update pipeline tracking
        ...(pipelineId && { pipelineId }),
        ...(audienceType && { audienceType }),
        ...(mappedStage && { currentStage: mappedStage }),
        
        // Update event relationship
        ...(eventId && { eventId }),
        spouseOrOther,
        howManyInParty,
        
        // Form tracking
        submittedFormId: publicForm.id
      },
      create: {
        // Personhood
        firstName,
        lastName,
        email,
        phone,
        goesBy,
        
        // Org relationship
        orgId,
        isOrgMember: audienceType === 'org_members',
        
        // Pipeline tracking
        pipelineId,
        audienceType,
        currentStage: mappedStage,
        
        // Event relationship
        eventId,
        spouseOrOther,
        howManyInParty,
        
        // Form tracking
        submittedFormId: publicForm.id
      }
    });
    
    // Increment submission count
    await prisma.publicForm.update({
      where: { id: publicForm.id },
      data: {
        submissionCount: {
          increment: 1
        }
      }
    });
    
    console.log('✅ Form submission processed - Contact:', contact.id);
    
    res.json({
      success: true,
      message: 'Form submitted successfully',
      contactId: contact.id
    });
    
  } catch (error) {
    console.error('❌ Form submission error:', error);
    res.status(500).json({ error: 'Failed to process form submission' });
  }
});

export default router;

