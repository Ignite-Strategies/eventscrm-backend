import express from 'express';
import { getPrismaClient } from '../config/database.js';
import { validateAndCleanEventData } from '../services/eventDataCheckerService.js';
// import { populateEventPipeline } from '../services/audience.js'; // DEPRECATED - audience is same as pipeline

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
    
    // DEPRECATED: Auto-populate is no longer needed - pipelines created on invite
    console.log('✅ Event created successfully - pipelines will be created on invite');
    
    res.status(201).json(event);
  } catch (error) {
    console.error('❌ Event creation error:', error);
    console.error('❌ Error details:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// List events for org
router.get('/:orgId/events', async (req, res) => {
  try {
    console.log('📋 FETCHING EVENTS for org:', req.params.orgId);
    console.log('📋 Full URL:', req.originalUrl);
    console.log('📋 Method:', req.method);
    
    const events = await prisma.event.findMany({
      where: { orgId: req.params.orgId },
      orderBy: { date: 'desc' }
    });
    
    console.log(`✅ FOUND ${events.length} events for org ${req.params.orgId}:`);
    events.forEach(event => {
      console.log(`  - ${event.name} (${event.id})`);
    });
    
    res.json(events);
  } catch (error) {
    console.error('❌ LIST EVENTS ERROR:', error);
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

export default router;

