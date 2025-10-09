import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * POST /forms/:slug/submit - Public form submission
 * No auth required - this is for external form submissions
 */
router.post('/:slug/submit', async (req, res) => {
  try {
    const { slug } = req.params;
    const submissionData = req.body;
    
    console.log('📝 Form submission received for:', slug);
    console.log('📋 Submission data:', submissionData);
    
    // Get the PublicForm
    const publicForm = await prisma.publicForm.findUnique({
      where: { slug },
      include: {
        event: true
      }
    });
    
    if (!publicForm) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    if (!publicForm.isActive) {
      return res.status(400).json({ error: 'Form is not active' });
    }
    
    // Extract contact data from standard fields
    const firstName = submissionData.firstName || '';
    const lastName = submissionData.lastName || '';
    const email = submissionData.email?.toLowerCase().trim();
    const phone = submissionData.phone?.trim();
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find or create Contact
    let contact = await prisma.contact.findUnique({
      where: { email }
    });
    
    if (!contact) {
      console.log('🆕 Creating new contact:', email);
      contact = await prisma.contact.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          orgId: publicForm.orgId
        }
      });
    } else {
      console.log('✅ Found existing contact:', email);
      // Update contact if new info provided
      if (firstName || lastName || phone) {
        contact = await prisma.contact.update({
          where: { id: contact.id },
          data: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(phone && { phone })
          }
        });
      }
    }
    
    // Check if EventAttendee already exists
    let attendee = await prisma.eventAttendee.findUnique({
      where: {
        eventId_contactId: {
          eventId: publicForm.eventId,
          contactId: contact.id
        }
      }
    });
    
    // Collect custom field responses (exclude standard fields)
    const customFieldResponses = {};
    Object.keys(submissionData).forEach(key => {
      if (!['firstName', 'lastName', 'email', 'phone'].includes(key)) {
        customFieldResponses[key] = submissionData[key];
      }
    });
    
    if (attendee) {
      console.log('🔄 Updating existing attendee');
      // Update existing attendee
      attendee = await prisma.eventAttendee.update({
        where: { id: attendee.id },
        data: {
          currentStage: publicForm.targetStage,
          audienceType: publicForm.audienceType,
          notes: JSON.stringify(customFieldResponses)
        }
      });
    } else {
      console.log('🆕 Creating new attendee');
      // Create new attendee
      attendee = await prisma.eventAttendee.create({
        data: {
          orgId: publicForm.orgId,
          eventId: publicForm.eventId,
          contactId: contact.id,
          currentStage: publicForm.targetStage,
          audienceType: publicForm.audienceType,
          notes: JSON.stringify(customFieldResponses)
        }
      });
    }
    
    // Increment submission count
    await prisma.publicForm.update({
      where: { id: publicForm.id },
      data: {
        submissionCount: {
          increment: 1
        }
      }
    });
    
    console.log('✅ Form submission processed successfully');
    
    res.json({
      success: true,
      message: 'Form submitted successfully',
      contactId: contact.id,
      attendeeId: attendee.id
    });
    
  } catch (error) {
    console.error('❌ Form submission error:', error);
    res.status(500).json({ error: 'Failed to process form submission' });
  }
});

export default router;
