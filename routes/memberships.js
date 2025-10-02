import express from 'express';
import ContactEventMembership from '../models/ContactEventMembership.js';
import Contact from '../models/Contact.js';
import Event from '../models/Event.js';
import { applyIntakeRules, markAsChampion } from '../services/pipelineService.js';

const router = express.Router();

// Add contact(s) to event
router.post('/:eventId/memberships', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { contactIds, stage = 'sop_entry', source = 'admin_add' } = req.body;
    
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    const memberships = await Promise.all(
      contactIds.map(async (contactId) => {
        const contact = await Contact.findById(contactId);
        if (!contact) return null;
        
        const membershipData = {
          orgId: event.orgId,
          eventId,
          contactId,
          stage,
          source,
          tags: [`source:${source}`]
        };
        
        const membership = await ContactEventMembership.findOneAndUpdate(
          { orgId: event.orgId, eventId, contactId },
          membershipData,
          { upsert: true, new: true }
        );
        
        return membership;
      })
    );
    
    res.json(memberships.filter(m => m !== null));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Soft RSVP from landing form
router.post('/:eventId/memberships/from-form', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, email, phone, rsvp, source = 'landing_form' } = req.body;
    
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    // Upsert contact in org master CRM
    const contact = await Contact.findOneAndUpdate(
      { orgId: event.orgId, email: email.toLowerCase().trim() },
      { 
        orgId: event.orgId,
        email: email.toLowerCase().trim(), 
        name,
        phone: phone || ""
      },
      { upsert: true, new: true }
    );
    
    // Create/update membership
    let membership = await ContactEventMembership.findOne({
      orgId: event.orgId,
      eventId,
      contactId: contact._id
    }) || new ContactEventMembership({
      orgId: event.orgId,
      eventId,
      contactId: contact._id,
      source
    });
    
    // Apply intake rules
    membership = applyIntakeRules({
      membership,
      event,
      intakeSource: source,
      formPayload: { rsvp }
    });
    
    await membership.save();
    
    res.status(201).json({ 
      contact, 
      membership,
      message: 'Successfully added to event pipeline'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update membership (stage, tags, etc.)
router.patch('/:membershipId', async (req, res) => {
  try {
    const { stage, tags, champion } = req.body;
    const updateData = {};
    
    if (stage) updateData.stage = stage;
    if (tags) updateData.tags = tags;
    if (champion !== undefined) updateData.champion = champion;
    
    const membership = await ContactEventMembership.findByIdAndUpdate(
      req.params.membershipId,
      updateData,
      { new: true }
    );
    
    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }
    
    res.json(membership);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark as champion
router.post('/:membershipId/champion', async (req, res) => {
  try {
    const { note } = req.body;
    
    let membership = await ContactEventMembership.findById(req.params.membershipId);
    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }
    
    membership = markAsChampion(membership, note);
    await membership.save();
    
    res.json(membership);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List memberships for event (with contact details)
router.get('/:eventId/memberships', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { stage, champion } = req.query;
    
    const query = { eventId };
    if (stage) query.stage = stage;
    if (champion === 'true') query.champion = true;
    
    const memberships = await ContactEventMembership.find(query)
      .populate('contactId')
      .sort({ createdAt: -1 });
    
    res.json(memberships);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

