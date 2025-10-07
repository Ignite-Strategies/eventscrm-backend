import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

/**
 * PUBLIC ENDPOINT - No auth required
 * Soft Commit Form Submission from Landing Pages
 * 
 * Creates/updates OrgMember and links to Event via EventAttendee
 * with stage="soft_commit"
 * 
 * Supports lookup by eventId OR slug (e.g., "brosandbrews")
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
    
    // Find or create OrgMember for this contact
    let orgMember = await prisma.orgMember.findFirst({
      where: {
        orgId: event.orgId,
        email: email.toLowerCase().trim()
      }
    });
    
    if (orgMember) {
      console.log('✅ Existing contact found:', orgMember.id);
      
      // Update phone if provided and not already set
      if (phone && !orgMember.phone) {
        orgMember = await prisma.orgMember.update({
          where: { id: orgMember.id },
          data: { phone }
        });
        console.log('📱 Updated phone for existing contact');
      }
    } else {
      console.log('📝 Creating new contact');
      
      // Create new OrgMember (contact only, no login access)
      orgMember = await prisma.orgMember.create({
        data: {
          orgId: event.orgId,
          firstName,
          lastName,
          email: email.toLowerCase().trim(),
          phone,
          role: null, // Just a contact, not a user
          firebaseId: null,
          categoryOfEngagement: 'medium',
          tags: []
        }
      });
      
      console.log('✅ New contact created:', orgMember.id);
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
        eventId_orgMemberId: {
          eventId: event.id,
          orgMemberId: orgMember.id
        }
      }
    });
    
    if (eventAttendee) {
      console.log('✅ Existing EventAttendee found, current stage:', eventAttendee.stage);
      
      // Only update stage if moving forward or re-engaging from "cant_attend"
      const currentLevel = stageHierarchy[eventAttendee.stage] || 0;
      const softCommitLevel = stageHierarchy['soft_commit'];
      
      if (currentLevel < softCommitLevel || eventAttendee.stage === 'cant_attend') {
        console.log('📈 Moving forward: ', eventAttendee.stage, '→ soft_commit');
        
        eventAttendee = await prisma.eventAttendee.update({
          where: { id: eventAttendee.id },
          data: {
            stage: 'soft_commit',
            audienceType: eventAttendee.audienceType || 'landing_page',
            notes: softCommitNotes,
            updatedAt: new Date()
          }
        });
      } else {
        console.log('⚠️ Contact already at higher stage (', eventAttendee.stage, '), just updating notes');
        
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
          orgMemberId: orgMember.id,
          stage: 'soft_commit',
          audienceType: 'landing_page',
          attended: false,
          amountPaid: 0,
          notes: softCommitNotes
        }
      });
    }
    
    console.log('🎉 Soft commit recorded!');
    console.log('   - Contact:', orgMember.email);
    console.log('   - Event:', event.name);
    console.log('   - Stage: soft_commit');
    console.log('   - Likelihood:', likelihood);
    console.log('   - Party size:', party_size);
    
    res.status(201).json({
      success: true,
      message: 'Soft commit recorded successfully',
      eventAttendeId: eventAttendee.id,
      orgMemberId: orgMember.id
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

