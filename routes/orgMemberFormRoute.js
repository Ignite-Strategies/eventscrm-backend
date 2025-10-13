import express from 'express';
import { getPrismaClient } from '../config/database.js';

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
    
    // Field mapping for custom form fields → Contact fields
    const fieldMap = {
      'f3_name': 'goesBy',
      'f3Name': 'goesBy',
      'nickname': 'goesBy',
      'goes_by': 'goesBy'
    };
    
    // Extract contact data from standard fields + mapped fields
    const firstName = submissionData.firstName || '';
    const lastName = submissionData.lastName || '';
    const email = submissionData.email?.toLowerCase().trim();
    const phone = submissionData.phone?.trim();
    
    // Map custom fields to Contact fields
    const goesBy = submissionData.goesBy 
      || submissionData.f3_name 
      || submissionData.f3Name 
      || submissionData.nickname 
      || submissionData.goes_by;
    
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
    const wifeAttending = submissionData.wife_attending 
      || submissionData.wifeAttending 
      || submissionData.bringing_wife 
      || submissionData.attendingWithSpouse;
    
    const attendingWithSpouse = wifeAttending 
      ? (wifeAttending.toLowerCase() === 'yes' || wifeAttending === true)
      : false;
    
    const whoBringingType = attendingWithSpouse ? 'wife' : 'solo';
    
    const howManyInParty = submissionData.howManyInParty 
      || submissionData.how_many_in_party
      || submissionData.partySize
      || (attendingWithSpouse ? 2 : 1);  // Default: 2 if bringing spouse, 1 if solo
    
    // Map likelihood to attend string → value (1-4)
    const likelihoodString = submissionData.likelihoodToAttend 
      || submissionData.likelihood_to_attend
      || submissionData.willAttend;
    
    let likelihoodToAttendId = null;
    if (likelihoodString) {
      const likelihoodMap = {
        'high': 1,
        'definitely': 1,
        'yes': 1,
        'medium': 2,
        'maybe': 2,
        'possibly': 2,
        'low': 3,
        'unlikely': 3,
        'probably_not': 3,
        'support_from_afar': 4,
        'no': 4,
        'cant_make_it': 4
      };
      
      const likelihoodValue = likelihoodMap[likelihoodString.toLowerCase()] || 2; // Default: medium
      
      // Find the LikelihoodToAttend record
      const likelihood = await prisma.likelihoodToAttend.findUnique({
        where: { value: likelihoodValue }
      });
      
      if (likelihood) {
        likelihoodToAttendId = likelihood.id;
      }
    }
    
    // Collect truly custom field responses (exclude standard, mapped, and event-specific fields)
    const standardFields = ['firstName', 'lastName', 'email', 'phone'];
    const mappedToContactFields = ['goesBy', 'f3_name', 'f3Name', 'nickname', 'goes_by'];
    const mappedToEventFields = [
      'wife_attending', 'wifeAttending', 'bringing_wife', 'attendingWithSpouse',
      'howManyInParty', 'how_many_in_party', 'partySize',
      'likelihoodToAttend', 'likelihood_to_attend', 'willAttend', 'definitely', 'maybe', 'unlikely'
    ];
    const customFieldResponses = {};
    
    Object.keys(submissionData).forEach(key => {
      if (!standardFields.includes(key) 
          && !mappedToContactFields.includes(key)
          && !mappedToEventFields.includes(key)) {
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
          submittedFormId: publicForm.id,
          whoBringingType,
          attendingWithSpouse,
          ...(howManyInParty && { howManyInParty: parseInt(howManyInParty) }),
          ...(likelihoodToAttend && { likelihoodToAttend }),
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
          whoBringingType,
          attendingWithSpouse,
          ...(howManyInParty && { howManyInParty: parseInt(howManyInParty) }),
          ...(likelihoodToAttend && { likelihoodToAttend }),
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

