import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

// Create event
router.post('/:orgId/events', async (req, res) => {
  try {
    const { orgId } = req.params;
    console.log('📝 Creating event for org:', orgId);
    console.log('📝 Event data received:', JSON.stringify(req.body, null, 2));
    
    // Get org defaults if pipelines not specified
    const org = await prisma.organization.findUnique({
      where: { id: orgId }
    });
    if (!org) {
      console.log('❌ Org not found:', orgId);
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Convert date string to ISO DateTime if provided
    let dateTime = null;
    if (req.body.date) {
      dateTime = new Date(req.body.date + 'T00:00:00.000Z'); // Convert to ISO DateTime
    }
    
    const eventData = {
      ...req.body,
      date: dateTime, // Prisma expects DateTime, not string
      orgId,
      pipelines: req.body.pipelines || org.pipelineDefaults
    };
    
    console.log('📝 Final event data to create:', JSON.stringify(eventData, null, 2));
    
    const event = await prisma.event.create({
      data: eventData
    });
    
    console.log('✅ Event created:', event.id);
    res.status(201).json(event);
  } catch (error) {
    console.error('❌ Event creation error:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Stack:', error.stack);
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

