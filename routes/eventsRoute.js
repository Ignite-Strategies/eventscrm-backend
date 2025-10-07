import express from 'express';
import { getPrismaClient } from '../config/database.js';
import { validateAndCleanEventData } from '../services/eventDataCheckerService.js';
import { populateEventPipeline } from '../services/audience.js';

const router = express.Router();
const prisma = getPrismaClient();

// Create event
router.post('/:orgId/events', async (req, res) => {
  try {
    const { orgId } = req.params;
    console.log('📝 Creating event for org:', orgId);
    console.log('📝 Raw data received:', JSON.stringify(req.body, null, 2));
    
    // Verify org exists
    const org = await prisma.organization.findUnique({
      where: { id: orgId }
    });
    if (!org) {
      console.log('❌ Org not found:', orgId);
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Validate and clean data (service ensures Prisma-safe format)
    const eventData = validateAndCleanEventData(req.body, org.pipelineDefaults);
    
    // Add orgId
    eventData.orgId = orgId;
    
    // Create event with validated data
    const event = await prisma.event.create({
      data: eventData
    });
    
    console.log('✅ Event created:', event.id);
    console.log('📊 Event data in DB:', JSON.stringify(event, null, 2));
    
    // Verify it's actually in the database
    const verification = await prisma.event.findUnique({
      where: { id: event.id }
    });
    console.log('🔍 VERIFICATION: Event exists in DB?', verification ? 'YES' : 'NO');
    
    // Auto-populate event pipeline with all existing OrgMembers
    console.log('🎯 AUTO-POPULATING event pipeline...');
    const pipelineResult = await populateEventPipeline(event.id, orgId);
    
    if (pipelineResult.success) {
      console.log(`✅ Pipeline populated: ${pipelineResult.added} attendees added`);
    } else {
      console.log('⚠️ Pipeline population warning:', pipelineResult.error);
    }
    
    res.status(201).json({
      ...event,
      pipelinePopulated: pipelineResult.added || 0
    });
  } catch (error) {
    console.error('❌ Event creation error:', error);
    console.error('❌ Error details:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// List events for org
router.get('/:orgId/events', async (req, res) => {
  try {
    console.log('📋 Fetching events for org:', req.params.orgId);
    const events = await prisma.event.findMany({
      where: { orgId: req.params.orgId },
      orderBy: { date: 'desc' }
    });
    console.log(`✅ Found ${events.length} events`);
    res.json(events);
  } catch (error) {
    console.error('❌ List events error:', error);
    console.error('❌ Error details:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Get single event
router.get('/:eventId', async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.eventId }
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update event
router.patch('/:eventId', async (req, res) => {
  try {
    const event = await prisma.event.update({
      where: { id: req.params.eventId },
      data: req.body
    });
    res.json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get pipeline config for event
router.get('/:eventId/pipeline-config', async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.eventId },
      include: { org: true }
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    res.json({
      pipelines: event.pipelines || event.org.pipelineDefaults,
      pipelineRules: {
        autoSopOnIntake: event.autoSopOnIntake,
        sopTriggers: event.sopTriggers,
        rsvpTriggers: event.rsvpTriggers,
        paidTriggers: event.paidTriggers,
        championCriteria: {
          minEngagement: event.minEngagement,
          tagsAny: event.championTags,
          manualOverrideAllowed: event.manualOverrideAllowed
        }
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

