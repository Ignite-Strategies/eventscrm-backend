import express from 'express';
import { getPrismaClient } from '../config/database.js';
import { mapFormFields } from '../services/fieldMappingService.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * POST /contacts - Create contact from ORG MEMBER form submission
 * No auth required - this is for external form submissions
 * AUTO-ELEVATES to OrgMember if audienceType is "org_members"
 * Body should include: { slug, orgId, eventId, audienceType, targetStage, formData }
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
    
    // Use the field mapping service to process form data
    const mappedData = mapFormFields(submissionData);
    
    // Extract contact data
    const firstName = mappedData.contact.firstName || '';
    const lastName = mappedData.contact.lastName || '';
    const email = mappedData.contact.email?.toLowerCase().trim();
    const phone = mappedData.contact.phone?.trim();
    const goesBy = mappedData.contact.goesBy;
    
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
          phone,
          eventId,  // Link contact to this event
          ...(goesBy && { goesBy })
        }
      });
    } else {
      console.log('✅ Found existing contact:', email);
      // Update contact if new info provided
      const contactUpdates = {};
      if (firstName) contactUpdates.firstName = firstName;
      if (lastName) contactUpdates.lastName = lastName;
      if (phone) contactUpdates.phone = phone;
      if (goesBy) contactUpdates.goesBy = goesBy;
      contactUpdates.eventId = eventId;  // Always link to this event
      
      if (Object.keys(contactUpdates).length > 0) {
        contact = await prisma.contact.update({
          where: { id: contact.id },
          data: contactUpdates
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
    
    // Map form fields to EventAttendee columns
    
    // Extract EventAttendee data from mapped fields
    const spouseOrOther = mappedData.eventAttendee.spouseOrOther || 'solo';
    const howManyInParty = mappedData.eventAttendee.howManyInParty || (spouseOrOther === 'spouse' ? 2 : 1);
    
    // "How likely are you to attend?" → Map responses to 1-4
    const likelihoodString = submissionData.how_likely_to_attend 
      || submissionData.likelihood_to_attend
      || submissionData.likelihood;
    
    let likelihoodToAttendId = null;
    if (likelihoodString) {
      const likelihoodMap = {
        // "I'm in — planning to be there!"
        "i'm in": 1,
        "planning to be there": 1,
        "im in": 1,
        
        // "Most likely, just confirming logistics"
        "most likely": 2,
        "confirming logistics": 2,
        
        // "I'm a probably yes… unless chaos intervenes"
        "probably yes": 2,
        "chaos intervenes": 2,
        "probably": 2,
        
        // "Just here for the morale support"
        "morale support": 4,
        "just here for": 4,
        "support from afar": 4
      };
      
      // Try to find match in response text
      const lowerResponse = likelihoodString.toLowerCase();
      let likelihoodValue = 2; // Default: medium
      
      for (const [key, value] of Object.entries(likelihoodMap)) {
        if (lowerResponse.includes(key)) {
          likelihoodValue = value;
          break;
        }
      }
      
      // Find the LikelihoodToAttend record
      const likelihood = await prisma.likelihoodToAttend.findUnique({
        where: { value: likelihoodValue }
      });
      
      if (likelihood) {
        likelihoodToAttendId = likelihood.id;
      }
    }
    
    // Use custom fields from the mapping service
    const customFieldResponses = mappedData.customFields;
    
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
          submittedFormId: publicForm.id,
          spouseOrOther,
          ...(howManyInParty && { howManyInParty: parseInt(howManyInParty) }),
          ...(likelihoodToAttendId && { likelihoodToAttendId }),
          notes: customFieldResponses  // Json type - no stringify needed!
        }
      });
    } else {
      console.log('🆕 Creating new attendee');
      // Create new attendee
      attendee = await prisma.eventAttendee.create({
      data: {
        orgId: orgId,
        eventId: eventId,
        contactId: contact.id,
        currentStage: mappedStage,
        audienceType: audienceType,
        submittedFormId: publicForm.id,
        spouseOrOther,
        ...(howManyInParty && { howManyInParty: parseInt(howManyInParty) }),
        ...(likelihoodToAttendId && { likelihoodToAttendId }),
        notes: customFieldResponses  // Json type - no stringify needed!
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
              orgId: orgId
              // OrgMember-specific fields (like yearsWithOrganization) would go here if in form
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

