import express from 'express';
import { getPrismaClient } from '../config/database.js';
import { mapFormFields, createOrUpdateContact } from '../services/formMapperService.js';

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
    const { eventId, containerId, orgId, pipelineId, audienceType, targetStage, formData } = req.body;
    
    console.log('📝 Form submission received for eventId:', eventId);
    console.log('📋 Submission data:', formData);
    console.log('🔍 Request body context:', { eventId, containerId, orgId, audienceType, targetStage });
    
    // Get the PublicForm by eventId (not slug!)
    const publicForm = await prisma.publicForm.findFirst({
      where: { eventId },
      include: { 
        event: {
          include: {
            org: {
              include: {
                container: true
              }
            }
          }
        }
      }
    });
    
    if (!publicForm) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    if (!publicForm.isActive) {
      return res.status(400).json({ error: 'Form is not active' });
    }
    
    // 🔥 THE ONE SERVICE - MAPS, HYDRATES, AND CREATES CONTACT!
    const mappedData = mapFormFields(formData);
    
    // Map stage names (backward compatibility)
    let mappedStage = targetStage;
    if (targetStage === 'soft_commit' || targetStage === 'rsvp') {
      mappedStage = 'rsvped';
    }
    
    // Use containerId from request, or fallback to org hierarchy
    const finalContainerId = containerId || publicForm.event?.org?.containerId || null;
    
    // Context for contact creation
    const context = {
      containerId: finalContainerId,
      orgId,
      eventId,
      audienceType,
      currentStage: mappedStage,
      submittedFormId: publicForm.id
    };
    
    // THE ONE SERVICE DOES EVERYTHING!
    const contact = await createOrUpdateContact(mappedData, context, prisma);
    
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

// Email confirmation function
async function sendEmailConfirmation(contact, publicForm) {
  try {
    // For now, we'll use a simple approach without OAuth
    // In production, you'd need to set up proper OAuth flow
    console.log('📧 Would send email confirmation to:', contact.email);
    console.log('📧 Event:', publicForm.title);
    
    // TODO: Implement actual email sending when OAuth is set up
    // const gmailService = new GmailService(accessToken);
    // await gmailService.sendEmail({
    //   to: contact.email,
    //   subject: `Thank you for committing to ${publicForm.title}!`,
    //   body: `
    //     <h2>Thank you for committing to coming!</h2>
    //     <p>Hi ${contact.firstName},</p>
    //     <p>We look forward to having you at ${publicForm.title}!</p>
    //     <p>Details will be sent closer to the event.</p>
    //     <p>Best regards,<br>F3 Capital Impact Team</p>
    //   `
    // });
    
    return true;
  } catch (error) {
    console.error('❌ Email confirmation error:', error);
    throw error;
  }
}

export default router;

