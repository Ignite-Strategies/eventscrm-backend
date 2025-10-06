import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

// Create event
router.post('/:orgId/events', async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Get org defaults if pipelines not specified
    const org = await prisma.organization.findUnique({
      where: { id: orgId }
    });
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    
    const eventData = {
      ...req.body,
      orgId,
      pipelines: req.body.pipelines || org.pipelineDefaults
    };
    
    const event = await prisma.event.create({
      data: eventData
    });
    
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List events for org
router.get('/:orgId/events', async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { orgId: req.params.orgId },
      orderBy: { date: 'desc' }
    });
    res.json(events);
  } catch (error) {
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

