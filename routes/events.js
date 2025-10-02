import express from 'express';
import Event from '../models/Event.js';
import Organization from '../models/Organization.js';

const router = express.Router();

// Create event
router.post('/:orgId/events', async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Get org defaults if pipelines not specified
    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    
    const eventData = {
      ...req.body,
      orgId,
      pipelines: req.body.pipelines || org.pipelineDefaults
    };
    
    const event = new Event(eventData);
    await event.save();
    
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List events for org
router.get('/:orgId/events', async (req, res) => {
  try {
    const events = await Event.find({ orgId: req.params.orgId })
      .sort({ date: -1 });
    res.json(events);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get single event
router.get('/:eventId', async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update event
router.patch('/:eventId', async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.eventId,
      req.body,
      { new: true, runValidators: true }
    );
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get pipeline config for event
router.get('/:eventId/pipeline-config', async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    const org = await Organization.findById(event.orgId);
    
    res.json({
      pipelines: event.pipelines || org.pipelineDefaults,
      pipelineRules: event.pipelineRules
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

