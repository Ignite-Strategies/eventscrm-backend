import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * NEW GENERIC ENDPOINT - No auth required
 * Form Submission - Reads form config to know where to put the contact!
 * 
 * The form config determines:
 * - Which pipeline (audienceType)
 * - Which stage (targetStage)
 * - Which fields to collect
 */
router.post('/forms/:formSlug/submit', async (req, res) => {
  try {
    const { formSlug } = req.params;
    const formData = req.body;
    
    console.log('📝 Form submission for slug:', formSlug);
    
    // 1. Get the form config
    const form = await prisma.eventForm.findUnique({
      where: { slug: formSlug },
      include: {
        event: true
      }
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    if (!form.isActive) {
      return res.status(400).json({ error: 'Form is not active' });
    }
    
    console.log('✅ Form found:', form.name);
    console.log('🎯 Target audience:', form.audienceType);
    console.log('🎯 Target stage:', form.targetStage);
    
    // 2. Extract contact data from form submission
    const { name, email, phone } = formData;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    // Parse name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // 3. Find or create Contact (universal person record)
    let contact = await prisma.contact.findFirst({
      where: {
        orgId: form.orgId,
        email: email.toLowerCase().trim()
      }
    });
    
    if (contact) {
      console.log('✅ Existing contact found:', contact.id);
      if (phone && !contact.phone) {
        contact = await prisma.contact.update({
          where: { id: contact.id },
          data: { phone }
        });
      }
    } else {
      console.log('📝 Creating new contact');
      contact = await prisma.contact.create({
        data: {
          orgId: form.orgId,
          firstName,
          lastName,
          email: email.toLowerCase().trim(),
          phone: phone || null
        }
      });
    }
    
    // 4. Create EventAttendee using form's target stage!
    const notes = JSON.stringify({
      ...formData,
      formId: form.id,
      formSlug: form.slug,
      submitted_at: new Date().toISOString()
    });
    
    let eventAttendee = await prisma.eventAttendee.findUnique({
      where: {
        eventId_contactId_audienceType: {
          eventId: form.eventId,
          contactId: contact.id,
          audienceType: form.audienceType
        }
      }
    });
    
    if (eventAttendee) {
      // Update if stage is higher
      const stageHierarchy = ['in_funnel', 'general_awareness', 'personal_invite', 'expressed_interest', 'soft_commit', 'paid', 'cant_attend'];
      const currentLevel = stageHierarchy.indexOf(eventAttendee.currentStage);
      const targetLevel = stageHierarchy.indexOf(form.targetStage);
      
      if (targetLevel > currentLevel || eventAttendee.currentStage === 'cant_attend') {
        eventAttendee = await prisma.eventAttendee.update({
          where: { id: eventAttendee.id },
          data: { 
            currentStage: form.targetStage,
            notes,
            submittedFormId: form.id
          }
        });
      }
    } else {
      eventAttendee = await prisma.eventAttendee.create({
        data: {
          orgId: form.orgId,
          eventId: form.eventId,
          contactId: contact.id,
          currentStage: form.targetStage, // Uses form's target stage!
          audienceType: form.audienceType,
          notes,
          submittedFormId: form.id,
          attended: false,
          amountPaid: 0
        }
      });
    }
    
    // Update submission count
    await prisma.eventForm.update({
      where: { id: form.id },
      data: { submissionCount: { increment: 1 } }
    });
    
    console.log('✅ Form submission complete!');
    
    res.status(201).json({
      success: true,
      message: 'Form submitted successfully',
      contactId: contact.id
    });
    
  } catch (error) {
    console.error('❌ Form submission error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DEPRECATED - Old hardcoded endpoint
 * Keeping for backwards compatibility with existing softcommit.html
 */
router.post('/events/:eventIdOrSlug/soft-commit', async (req, res) => {
  try {
    const { eventIdOrSlug } = req.params;
    const { name, email, phone, likelihood, bringing_others, party_size, orgId } = req.body;
    
    console.log('🎯 Soft commit submission for event:', eventIdOrSlug);
    console.log('📧 Contact:', email);
    
    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, email, phone' 
      });
    }
    
    // Get event by ID or slug
    // If orgId provided, use slug lookup (more flexible for landing pages)
    let event;
    if (orgId) {
      event = await prisma.event.findFirst({
        where: { 
          orgId,
          slug: eventIdOrSlug 
        },
        include: { org: true }
      });
    } else {
      // Try by ID first
      event = await prisma.event.findUnique({
        where: { id: eventIdOrSlug },
        include: { org: true }
      });
    }
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    console.log('✅ Event found:', event.name, '(Org:', event.org.name, ')');
    
    // Parse name into first/last
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Find or create Contact for this person
    let contact = await prisma.contact.findFirst({
      where: {
        orgId: event.orgId,
        email: email.toLowerCase().trim()
      }
    });
    
    if (contact) {
      console.log('✅ Existing contact found:', contact.id);
      
      // Update phone if provided and not already set
      if (phone && !contact.phone) {
        contact = await prisma.contact.update({
          where: { id: contact.id },
          data: { phone }
        });
        console.log('📱 Updated phone for existing contact');
      }
    } else {
      console.log('📝 Creating new contact');
      
      // Create new Contact (universal person record)
      contact = await prisma.contact.create({
        data: {
          orgId: event.orgId,
          firstName,
          lastName,
          email: email.toLowerCase().trim(),
          phone: phone || null
        }
      });
      
      console.log('✅ New contact created:', contact.id);
    }
    
    // Create soft commit notes
    const softCommitNotes = JSON.stringify({
      likelihood,
      bringing_others,
      party_size,
      submitted_at: new Date().toISOString(),
      source: 'landing_page_soft_commit'
    });
    
    // Pipeline stage hierarchy (don't downgrade people!)
    // 7-stage funnel
    const stageHierarchy = {
      'in_funnel': 0,
      'general_awareness': 1,
      'personal_invite': 2,
      'expressed_interest': 3,
      'soft_commit': 4,
      'paid': 5,
      'cant_attend': -1 // Special: can always be re-engaged
    };
    
    // Find or create EventAttendee
    let eventAttendee = await prisma.eventAttendee.findUnique({
      where: {
        eventId_contactId_audienceType: {
          eventId: event.id,
          contactId: contact.id,
          audienceType: 'landing_page'
        }
      }
    });
    
    if (eventAttendee) {
      console.log('✅ Existing EventAttendee found, current stage:', eventAttendee.currentStage);
      
      // Only update stage if moving forward or re-engaging from "cant_attend"
      const currentLevel = stageHierarchy[eventAttendee.currentStage] || 0;
      const softCommitLevel = stageHierarchy['soft_commit'];
      
      if (currentLevel < softCommitLevel || eventAttendee.currentStage === 'cant_attend') {
        console.log('📈 Moving forward: ', eventAttendee.currentStage, '→ soft_commit');
        
        eventAttendee = await prisma.eventAttendee.update({
          where: { id: eventAttendee.id },
          data: {
            currentStage: 'soft_commit',
            audienceType: eventAttendee.audienceType || 'landing_page',
            notes: softCommitNotes,
            updatedAt: new Date()
          }
        });
      } else {
        console.log('⚠️ Contact already at higher stage (', eventAttendee.currentStage, '), just updating notes');
        
        // Don't downgrade, just update notes
        eventAttendee = await prisma.eventAttendee.update({
          where: { id: eventAttendee.id },
          data: {
            notes: softCommitNotes,
            updatedAt: new Date()
          }
        });
      }
    } else {
      console.log('📝 Creating new EventAttendee at soft_commit stage');
      
      // Create new EventAttendee
      eventAttendee = await prisma.eventAttendee.create({
        data: {
          orgId: event.orgId,
          eventId: event.id,
          contactId: contact.id,
          currentStage: 'soft_commit',
          audienceType: 'landing_page',
          attended: false,
          amountPaid: 0,
          notes: softCommitNotes
        }
      });
    }
    
    console.log('🎉 Soft commit recorded!');
    console.log('   - Contact:', contact.email);
    console.log('   - Event:', event.name);
    console.log('   - Stage: soft_commit');
    console.log('   - Likelihood:', likelihood);
    console.log('   - Party size:', party_size);
    
    res.status(201).json({
      success: true,
      message: 'Soft commit recorded successfully',
      eventAttendeId: eventAttendee.id,
      contactId: contact.id
    });
    
  } catch (error) {
    console.error('❌ Soft commit error:', error);
    console.error('❌ Error details:', error.message);
    res.status(500).json({ 
      error: 'Failed to process soft commit',
      details: error.message 
    });
  }
});

export default router;

