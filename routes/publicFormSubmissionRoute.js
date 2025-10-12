import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * POST /contacts - Create contact from form submission
 * No auth required - this is for external form submissions
 * Body should include: { slug, formData }
 */
router.post('/', async (req, res) => {
  try {
    const { slug, orgId, eventId, audienceType, targetStage, formData } = req.body;
    const submissionData = formData;
    
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
    
    // Find or create Contact (Contact-First: universal personhood, no orgId!)
    let contact = await prisma.contact.findUnique({
      where: { 
        email: email  // Global unique lookup
      }
    });
    
    if (!contact) {
      console.log('🆕 Creating new contact:', email);
      contact = await prisma.contact.create({
        data: {
          firstName,
          lastName,
          email,
          phone
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
        eventId_contactId_audienceType: {
          eventId: eventId,
          contactId: contact.id,
          audienceType: audienceType
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
    
    // Map old stage names to new correct ones for backward compatibility
    let mappedStage = targetStage;
    if (targetStage === 'soft_commit' || targetStage === 'rsvp') {
      mappedStage = 'rsvped'; // Grammatically correct past tense
    }
    
    if (attendee) {
      console.log('🔄 Updating existing attendee');
      // Update existing attendee
      attendee = await prisma.eventAttendee.update({
        where: { id: attendee.id },
        data: {
          currentStage: mappedStage,
          audienceType: audienceType,
          submittedFormId: publicForm.id, // Track which form they used
          notes: JSON.stringify(customFieldResponses)
        }
      });
    } else {
      console.log('🆕 Creating new attendee');
      // Create new attendee
      attendee = await prisma.eventAttendee.create({
        data: {
          orgId: orgId,  // ← From localStorage (frontend)
          eventId: eventId,  // ← From localStorage (frontend)
          contactId: contact.id,
          currentStage: mappedStage,
          audienceType: audienceType, // ← From frontend
          submittedFormId: publicForm.id, // Track which form they used
          notes: JSON.stringify(customFieldResponses)
        }
      });
    }
    
    // Create OrgMember if audienceType is "org_members"
    let orgMember = null;
    if (audienceType === 'org_members') {
      try {
        // Check if OrgMember already exists for this Contact
        const existingOrgMember = await prisma.orgMember.findUnique({
          where: { contactId: contact.id }
        });
        
        if (!existingOrgMember) {
          console.log('🆕 Creating OrgMember for org_members audience');
          orgMember = await prisma.orgMember.create({
            data: {
              contactId: contact.id,
              orgId: orgId,
              // Add any additional OrgMember fields from custom form data if available
              notes: JSON.stringify(customFieldResponses)
            }
          });
        } else {
          console.log('✅ OrgMember already exists for this Contact');
          orgMember = existingOrgMember;
        }
      } catch (orgMemberError) {
        console.error('❌ Error creating OrgMember:', orgMemberError);
        // Continue even if OrgMember creation fails
      }
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

